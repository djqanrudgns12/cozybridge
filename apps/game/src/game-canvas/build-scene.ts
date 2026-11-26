import Phaser from 'phaser';
import type { LessonGuideSegment, LevelDefinition } from '@linebound/content';
import {
  DEFAULT_MAX_MEMBER_LENGTH,
  type SimulationFrame,
  type EntityId,
  type GridPoint,
} from '@linebound/domain';
import { computeInitialTruckSpawn } from '@linebound/simulation';
import {
  CANVAS_PALETTES,
  type CanvasPalette,
  type ThemeId,
} from '../styles/design-tokens';
import type { MemberData } from './command-history';

export interface PreviewOverlayInfo {
  visible: boolean;
  screenX: number;
  screenY: number;
  lengthCells: number;
  cost: number;
  maxLength: number;
  isTooLong: boolean;
  isOverBudget: boolean;
}

export interface GameCanvasConfig {
  parent: HTMLElement;
  level?: LevelDefinition;
  theme?: ThemeId;
  grid: {
    width: number;
    height: number;
    cellSize: number;
  };
  initialMembers?: MemberData[];
  lockedMemberIds?: ReadonlySet<string>;
  lessonGuides?: readonly LessonGuideSegment[];
  showLessonGuide?: boolean;
  initialTool?: 'build' | 'delete';
  onMemberCreated?: (member: MemberData, cost: number) => void;
  onMemberDeleted?: (member: MemberData, cost: number) => void;
  onPreviewChange?: (info: PreviewOverlayInfo | null) => void;
  onBuildWarning?: (message: string) => void;
}

/**
 * 섹션 4-2 미니멀 모눈 스케치북 캔버스 씬 (Clean Grid Paper)
 * - 구름·회색 아파트·물결 애니메이션 등 시선을 뺏는 장식 요소를 모두 제거하고,
 *   모눈종이 위에 지형 단면·출발 트럭/도착 깃발·고정 핀·다리 막대만 선명하게 표현합니다.
 * - 모든 텍스트 안내는 깨짐 없는 React HTML 오버레이로 전달합니다.
 */
export class BuildScene extends Phaser.Scene {
  private paperGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private terrainGraphics!: Phaser.GameObjects.Graphics;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private anchorGraphics!: Phaser.GameObjects.Graphics;
  private memberGraphics!: Phaser.GameObjects.Graphics;
  private guideGraphics!: Phaser.GameObjects.Graphics;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private nodeGraphics!: Phaser.GameObjects.Graphics;
  private truckGraphics!: Phaser.GameObjects.Graphics;

  private gridConfig = { width: 20, height: 12, cellSize: 40 };
  private level?: LevelDefinition;
  private themeId: ThemeId = 'craft';
  private isCreated: boolean = false;

  private isSimulating: boolean = false;
  private activeTool: 'build' | 'delete' = 'build';

  private buildStartNode: { x: number; y: number } | null = null;
  private hoveredGrid: { x: number; y: number } | null = null;
  private nodes: Map<string, { x: number; y: number }> = new Map();
  private members: MemberData[] = [];
  private lockedMemberIds: Set<string> = new Set();
  private lessonGuides: readonly LessonGuideSegment[] = [];
  private showLessonGuide: boolean = true;

  private onMemberCreated?: (member: MemberData, cost: number) => void;
  private onMemberDeleted?: (member: MemberData, cost: number) => void;
  private onPreviewChange?: (info: PreviewOverlayInfo | null) => void;
  private onBuildWarning?: (message: string) => void;

  constructor() {
    super({ key: 'BuildScene' });
  }

  private get palette(): CanvasPalette {
    return CANVAS_PALETTES[this.themeId] ?? CANVAS_PALETTES.craft;
  }

  setLevel(level?: LevelDefinition) {
    this.level = level;
    if (level) {
      this.gridConfig = level.gridConfig;
    }
  }

  setGridConfig(config: { width: number; height: number; cellSize: number }) {
    this.gridConfig = config;
  }

  setTheme(theme: ThemeId) {
    this.themeId = theme;
    if (!this.isCreated) return;
    this.cameras.main?.setBackgroundColor(this.palette.paperBg);
    this.redrawAllStatic();
  }

  setLockedMemberIds(ids: ReadonlySet<string>) {
    this.lockedMemberIds = new Set(ids);
    if (this.isCreated && !this.isSimulating) {
      this.drawMembers();
      this.drawLessonGuides();
    }
  }

  setLessonGuide(guides: readonly LessonGuideSegment[], show: boolean) {
    this.lessonGuides = guides;
    this.showLessonGuide = show;
    if (this.isCreated && !this.isSimulating) {
      this.drawLessonGuides();
    }
  }

  setCallbacks(callbacks: {
    onMemberCreated?: (member: MemberData, cost: number) => void;
    onMemberDeleted?: (member: MemberData, cost: number) => void;
    onPreviewChange?: (info: PreviewOverlayInfo | null) => void;
    onBuildWarning?: (message: string) => void;
  }) {
    this.onMemberCreated = callbacks.onMemberCreated;
    this.onMemberDeleted = callbacks.onMemberDeleted;
    this.onPreviewChange = callbacks.onPreviewChange;
    this.onBuildWarning = callbacks.onBuildWarning;
  }

  setActiveTool(tool: 'build' | 'delete') {
    this.activeTool = tool;
    this.buildStartNode = null;
    this.previewGraphics?.clear();
    this.onPreviewChange?.(null);
  }

  setSimulating(simulating: boolean) {
    this.isSimulating = simulating;
    if (simulating) {
      this.buildStartNode = null;
      this.previewGraphics?.clear();
      this.guideGraphics?.clear();
      this.onPreviewChange?.(null);
      this.drawMarkers(true);
    } else {
      this.truckGraphics?.clear();
      this.truckGraphics?.setPosition(0, 0);
      this.truckGraphics?.setRotation(0);
      this.drawMarkers(false);
      this.drawMembers();
      this.drawLessonGuides();
      this.drawNodes();
    }
  }

  private getMaxMemberLength(): number {
    return this.level?.maxMemberLength ?? DEFAULT_MAX_MEMBER_LENGTH;
  }

  private getCurrentTotalCost(): number {
    const unitCost = this.level?.unitCost ?? 500;
    let total = 0;
    for (const m of this.members) {
      total += Math.hypot(m.endX - m.startX, m.endY - m.startY) * unitCost;
    }
    return total;
  }

  create() {
    this.paperGraphics = this.add.graphics();
    this.gridGraphics = this.add.graphics();
    this.terrainGraphics = this.add.graphics();
    this.markerGraphics = this.add.graphics();
    this.anchorGraphics = this.add.graphics();
    this.memberGraphics = this.add.graphics();
    this.guideGraphics = this.add.graphics();
    this.previewGraphics = this.add.graphics();
    this.nodeGraphics = this.add.graphics();
    this.truckGraphics = this.add.graphics();
    this.isCreated = true;

    this.cameras.main.setBackgroundColor(this.palette.paperBg);
    this.redrawAllStatic();
    this.setupInput();

    const worldWidth = this.gridConfig.width * this.gridConfig.cellSize;
    const worldHeight = this.gridConfig.height * this.gridConfig.cellSize;
    this.cameras.main.setBounds(
      -400,
      -250,
      worldWidth + 800,
      worldHeight + 500,
    );

    const fitCamera = () => {
      const cam = this.cameras.main;
      if (!cam || cam.width === 0 || cam.height === 0) return;
      const padX = 48;
      const padY = 48;
      const zoomX = cam.width / (worldWidth + padX * 2);
      const zoomY = cam.height / (worldHeight + padY * 2);
      const fitZoom = Math.min(zoomX, zoomY, 1.32);
      cam.setZoom(Math.max(fitZoom, 0.62));
      cam.centerOn(worldWidth / 2, worldHeight / 2);
    };

    fitCamera();
    this.scale.on('resize', fitCamera);
  }

  private redrawAllStatic() {
    this.drawPaper();
    this.drawGrid();
    this.drawTerrain();
    this.drawMarkers(this.isSimulating);
    this.drawAnchors();
    if (!this.isSimulating) {
      this.drawMembers();
      this.drawLessonGuides();
      this.drawNodes();
      this.drawPreview();
    }
  }

  private drawPaper() {
    const g = this.paperGraphics;
    g.clear();
    const worldWidth = this.gridConfig.width * this.gridConfig.cellSize;
    const worldHeight = this.gridConfig.height * this.gridConfig.cellSize;
    g.fillStyle(this.palette.paperHex, 1.0);
    g.fillRect(-800, -500, worldWidth + 1600, worldHeight + 1000);
  }

  private drawGrid() {
    const { width, height, cellSize } = this.gridConfig;
    const pal = this.palette;
    const g = this.gridGraphics;
    g.clear();

    // 1칸 보조 모눈선
    g.lineStyle(1, pal.gridMinor, 0.85);
    g.beginPath();
    for (let x = 0; x <= width; x++) {
      if (x % 5 === 0) continue;
      g.moveTo(x * cellSize, 0);
      g.lineTo(x * cellSize, height * cellSize);
    }
    for (let y = 0; y <= height; y++) {
      if (y % 5 === 0) continue;
      g.moveTo(0, y * cellSize);
      g.lineTo(width * cellSize, y * cellSize);
    }
    g.strokePath();

    // 5칸 주 모눈선 + 외곽 테두리
    g.lineStyle(1.4, pal.gridMajor, 0.95);
    g.beginPath();
    for (let x = 0; x <= width; x += 5) {
      g.moveTo(x * cellSize, 0);
      g.lineTo(x * cellSize, height * cellSize);
    }
    if (width % 5 !== 0) {
      g.moveTo(width * cellSize, 0);
      g.lineTo(width * cellSize, height * cellSize);
    }
    for (let y = 0; y <= height; y += 5) {
      g.moveTo(0, y * cellSize);
      g.lineTo(width * cellSize, y * cellSize);
    }
    if (height % 5 !== 0) {
      g.moveTo(0, height * cellSize);
      g.lineTo(width * cellSize, height * cellSize);
    }
    g.strokePath();

    // 모눈 교차 스냅 도트
    g.fillStyle(pal.gridDot, 0.85);
    for (let x = 0; x <= width; x++) {
      for (let y = 0; y <= height; y++) {
        g.fillCircle(x * cellSize, y * cellSize, 1.8);
      }
    }
  }

  /** 모눈 스케치북 스타일 깔끔한 지형 단면 */
  private drawTerrain() {
    const g = this.terrainGraphics;
    g.clear();
    if (!this.level) return;

    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;
    const worldBottom = (this.gridConfig.height + 6) * cellSize;

    let minX = Infinity;
    let maxX = -Infinity;
    let leftRoadY = 0;
    let rightRoadY = 0;

    for (const tile of this.level.terrain) {
      if (tile.x < minX) {
        minX = tile.x;
        leftRoadY = tile.y * cellSize;
      }
      if (tile.x > maxX) {
        maxX = tile.x;
        rightRoadY = tile.y * cellSize;
      }
    }

    // 좌측 연장 지형 단면
    const leftEdgeX = minX * cellSize - cellSize * 0.5;
    g.fillStyle(pal.terrainFill, 1.0);
    g.fillRect(-600, leftRoadY, leftEdgeX + 600, worldBottom - leftRoadY);
    g.lineStyle(3, pal.terrainTopLine, 1.0);
    g.beginPath();
    g.moveTo(-600, leftRoadY);
    g.lineTo(leftEdgeX, leftRoadY);
    g.strokePath();

    // 우측 연장 지형 단면
    const rightEdgeX = maxX * cellSize + cellSize * 0.5;
    const rightFarX = this.gridConfig.width * cellSize + 600;
    g.fillStyle(pal.terrainFill, 1.0);
    g.fillRect(
      rightEdgeX,
      rightRoadY,
      rightFarX - rightEdgeX,
      worldBottom - rightRoadY,
    );
    g.lineStyle(3, pal.terrainTopLine, 1.0);
    g.beginPath();
    g.moveTo(rightEdgeX, rightRoadY);
    g.lineTo(rightFarX, rightRoadY);
    g.strokePath();

    // 스테이지 내부 지형 타일 단면
    const terrainSet = new Set(this.level.terrain.map((t) => `${t.x},${t.y}`));
    const anchorSet = new Set(this.level.anchors.map((a) => `${a.x},${a.y}`));

    for (const tile of this.level.terrain) {
      const x = tile.x * cellSize;
      const y = tile.y * cellSize;

      const hasLeft = terrainSet.has(`${tile.x - 1},${tile.y}`);
      const hasRight = terrainSet.has(`${tile.x + 1},${tile.y}`);
      const hasAnchor = anchorSet.has(`${tile.x},${tile.y}`);

      const tileLeft =
        !hasLeft && hasRight && hasAnchor ? x : x - cellSize * 0.5;
      const tileRight =
        hasLeft && !hasRight && hasAnchor ? x : x + cellSize * 0.5;
      const tileWidth = tileRight - tileLeft;
      if (tileWidth <= 0) continue;

      g.fillStyle(pal.terrainFill, 1.0);
      g.fillRect(tileLeft, y, tileWidth + 0.5, worldBottom - y);

      // 상단 도로 굵은 도면 실선
      g.lineStyle(3, pal.terrainTopLine, 1.0);
      g.beginPath();
      g.moveTo(tileLeft, y);
      g.lineTo(tileRight, y);
      g.strokePath();

      // 절벽 수직 단면 실선
      if (!hasRight && tile.y < this.gridConfig.height) {
        g.lineStyle(2.2, pal.terrainTopLine, 0.75);
        g.beginPath();
        g.moveTo(tileRight, y);
        g.lineTo(tileRight, worldBottom);
        g.strokePath();
      }
      if (!hasLeft && tile.y < this.gridConfig.height) {
        g.lineStyle(2.2, pal.terrainTopLine, 0.75);
        g.beginPath();
        g.moveTo(tileLeft, y);
        g.lineTo(tileLeft, worldBottom);
        g.strokePath();
      }
    }
  }

  /** 출발 대기 트럭 픽토그램 & 우측 도착 깃발 표시 */
  private drawMarkers(hideWaitingTruck: boolean) {
    const g = this.markerGraphics;
    g.clear();
    if (!this.level || this.level.anchors.length === 0) return;

    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;
    const sortedAnchors = [...this.level.anchors].sort((a, b) => a.x - b.x);
    const rightAnchor = sortedAnchors[sortedAnchors.length - 1];

    // 좌측 출발 트럭 미리보기 (물리 초기 스폰 좌표·스케일과 정확히 일치시켜 출발 시 튕김/점프 방지)
    if (!hideWaitingTruck) {
      const spawn = computeInitialTruckSpawn(this.level);
      this.drawTruck(g, spawn.worldX, spawn.worldY + 4, 1, 0.95);
    }

    // 우측 도착 체크 깃발
    if (rightAnchor) {
      const fx = Math.min(this.gridConfig.width - 1.2, rightAnchor.x + 2.2) * cellSize;
      const fy = rightAnchor.y * cellSize;

      g.lineStyle(2.8, pal.terrainTopLine, 1.0);
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(fx, fy - 38);
      g.strokePath();

      g.fillStyle(pal.goalFlag, 1.0);
      g.beginPath();
      g.moveTo(fx, fy - 38);
      g.lineTo(fx + 24, fy - 29);
      g.lineTo(fx, fy - 20);
      g.closePath();
      g.fillPath();

      g.fillStyle(pal.terrainTopLine, 1.0);
      g.fillCircle(fx, fy - 39, 2.5);
    }
  }

  private drawAnchors() {
    const g = this.anchorGraphics;
    g.clear();
    if (!this.level) return;

    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;

    for (const anchor of this.level.anchors) {
      const x = anchor.x * cellSize;
      const y = anchor.y * cellSize;

      // 삼각형 지지 브래킷
      g.fillStyle(pal.anchorFill, 0.24);
      g.lineStyle(2, pal.anchorStroke, 0.85);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 11, y + 15);
      g.lineTo(x + 11, y + 15);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // 고정 핀 원형 볼트
      g.fillStyle(pal.anchorFill, 1.0);
      g.fillCircle(x, y, 7.5);
      g.lineStyle(2.4, pal.anchorStroke, 1.0);
      g.strokeCircle(x, y, 7.5);
      g.fillStyle(pal.nodeOuter, 1.0);
      g.fillCircle(x, y, 2.4);

      this.ensureNode(anchor.x, anchor.y);
    }
  }

  private setupInput() {
    const cellSize = this.gridConfig.cellSize;

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isSimulating) return;

      const gridX = Math.round(pointer.worldX / cellSize);
      const gridY = Math.round(pointer.worldY / cellSize);

      if (
        gridX >= 0 &&
        gridX <= this.gridConfig.width &&
        gridY >= 0 &&
        gridY <= this.gridConfig.height
      ) {
        this.hoveredGrid = { x: gridX, y: gridY };
      } else {
        this.hoveredGrid = null;
      }

      this.drawPreview(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isSimulating) return;

      if (this.activeTool === 'delete' && pointer.leftButtonDown()) {
        this.handleDeleteAt(pointer.worldX, pointer.worldY);
        return;
      }

      if (
        this.activeTool === 'build' &&
        pointer.leftButtonDown() &&
        this.hoveredGrid
      ) {
        if (!this.buildStartNode) {
          this.buildStartNode = { ...this.hoveredGrid };
          this.drawPreview(pointer);
        } else {
          const end = { ...this.hoveredGrid };

          if (
            end.x !== this.buildStartNode.x ||
            end.y !== this.buildStartNode.y
          ) {
            const dx = end.x - this.buildStartNode.x;
            const dy = end.y - this.buildStartNode.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const maxMemberLen = this.getMaxMemberLength();

            if (length > maxMemberLen + 1e-6) {
              this.onBuildWarning?.(
                `막대 하나는 최대 ${maxMemberLen}칸까지만 이을 수 있어요.`,
              );
              return;
            }

            const unitCost = this.level?.unitCost ?? 500;
            const budget = this.level?.budget ?? Infinity;
            const newCost = length * unitCost;
            if (
              Number.isFinite(budget) &&
              this.getCurrentTotalCost() + newCost > budget + 1e-6
            ) {
              this.onBuildWarning?.(
                '남은 돈이 부족해서 더 긴 막대를 놓을 수 없어요.',
              );
              return;
            }

            const isDuplicate = this.members.some(
              (m) =>
                (m.startX === this.buildStartNode!.x &&
                  m.startY === this.buildStartNode!.y &&
                  m.endX === end.x &&
                  m.endY === end.y) ||
                (m.startX === end.x &&
                  m.startY === end.y &&
                  m.endX === this.buildStartNode!.x &&
                  m.endY === this.buildStartNode!.y),
            );

            if (!isDuplicate) {
              this.ensureNode(this.buildStartNode.x, this.buildStartNode.y);
              this.ensureNode(end.x, end.y);
              const newMember: MemberData = {
                id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                startX: this.buildStartNode.x,
                startY: this.buildStartNode.y,
                endX: end.x,
                endY: end.y,
              };
              this.members.push(newMember);
              this.drawMembers();
              this.drawLessonGuides();
              this.drawNodes();
              this.onMemberCreated?.(newMember, newCost);
            }
          }

          this.buildStartNode = null;
          this.previewGraphics.clear();
          this.onPreviewChange?.(null);
        }
      }

      if (pointer.rightButtonDown()) {
        this.buildStartNode = null;
        this.previewGraphics.clear();
        this.onPreviewChange?.(null);
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.buildStartNode) {
        this.buildStartNode = null;
        this.previewGraphics?.clear();
        this.onPreviewChange?.(null);
      }
    });
  }

  private handleDeleteAt(worldX: number, worldY: number) {
    const cellSize = this.gridConfig.cellSize;
    const threshold = 14;

    const index = this.members.findIndex((m) => {
      const x1 = m.startX * cellSize;
      const y1 = m.startY * cellSize;
      const x2 = m.endX * cellSize;
      const y2 = m.endY * cellSize;
      return (
        this.distToSegment(
          { x: worldX, y: worldY },
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ) <= threshold
      );
    });

    if (index !== -1) {
      const candidate = this.members[index]!;
      if (this.lockedMemberIds.has(candidate.id)) {
        this.onBuildWarning?.(
          '기본으로 놓인 다리 막대예요! 지우지 않아도 괜찮아요.',
        );
        return;
      }

      const removed = this.members.splice(index, 1)[0]!;
      this.pruneUnusedNodes();
      this.drawMembers();
      this.drawLessonGuides();
      this.drawNodes();
      const length = Math.hypot(
        removed.endX - removed.startX,
        removed.endY - removed.startY,
      );
      const cost = length * (this.level?.unitCost ?? 500);
      this.onMemberDeleted?.(removed, cost);
    }
  }

  private pruneUnusedNodes() {
    const usedKeys = new Set<string>();
    if (this.level) {
      for (const anchor of this.level.anchors) {
        usedKeys.add(`${anchor.x},${anchor.y}`);
      }
    }
    for (const m of this.members) {
      usedKeys.add(`${m.startX},${m.startY}`);
      usedKeys.add(`${m.endX},${m.endY}`);
    }
    for (const key of Array.from(this.nodes.keys())) {
      if (!usedKeys.has(key)) {
        this.nodes.delete(key);
      }
    }
  }

  private distToSegment(
    p: { x: number; y: number },
    v: { x: number; y: number },
    w: { x: number; y: number },
  ): number {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(
      p.x - (v.x + t * (w.x - v.x)),
      p.y - (v.y + t * (w.y - v.y)),
    );
  }

  private ensureNode(x: number, y: number) {
    const key = `${x},${y}`;
    if (!this.nodes.has(key)) {
      this.nodes.set(key, { x, y });
    }
  }

  private drawNodes() {
    const g = this.nodeGraphics;
    g.clear();
    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;
    const anchorSet = new Set(
      (this.level?.anchors ?? []).map((a) => `${a.x},${a.y}`),
    );

    for (const node of this.nodes.values()) {
      const isAnchor = anchorSet.has(`${node.x},${node.y}`);
      if (isAnchor) continue; // 고정 핀은 drawAnchors에서 강조 표현

      const worldX = node.x * cellSize;
      const worldY = node.y * cellSize;

      g.fillStyle(pal.nodeOuter, 1.0);
      g.fillCircle(worldX, worldY, 6.5);
      g.lineStyle(2, pal.nodeInner, 1.0);
      g.strokeCircle(worldX, worldY, 6.5);
      g.fillStyle(pal.nodeInner, 1.0);
      g.fillCircle(worldX, worldY, 2.8);
    }
  }

  private drawMembers() {
    const g = this.memberGraphics;
    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;
    g.clear();

    for (const member of this.members) {
      const sx = member.startX * cellSize;
      const sy = member.startY * cellSize;
      const ex = member.endX * cellSize;
      const ey = member.endY * cellSize;

      g.lineStyle(6.5, pal.memberBase, 1.0);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();

      g.lineStyle(1.8, pal.memberHighlight, 0.55);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();
    }
  }

  private drawPreview(pointer?: Phaser.Input.Pointer) {
    const g = this.previewGraphics;
    const pal = this.palette;
    g.clear();

    if (this.hoveredGrid) {
      const cellSize = this.gridConfig.cellSize;
      const worldX = this.hoveredGrid.x * cellSize;
      const worldY = this.hoveredGrid.y * cellSize;

      const hoverColor =
        this.activeTool === 'delete' ? pal.memberInvalid : pal.memberPreview;

      g.fillStyle(hoverColor, 0.2);
      g.fillCircle(worldX, worldY, 9);
      g.lineStyle(2, hoverColor, 0.9);
      g.strokeCircle(worldX, worldY, 9);
    }

    if (
      this.buildStartNode &&
      this.hoveredGrid &&
      this.activeTool === 'build'
    ) {
      const cellSize = this.gridConfig.cellSize;
      const startX = this.buildStartNode.x * cellSize;
      const startY = this.buildStartNode.y * cellSize;
      const endX = this.hoveredGrid.x * cellSize;
      const endY = this.hoveredGrid.y * cellSize;

      const isSamePoint =
        this.buildStartNode.x === this.hoveredGrid.x &&
        this.buildStartNode.y === this.hoveredGrid.y;

      if (!isSamePoint) {
        const dx = this.hoveredGrid.x - this.buildStartNode.x;
        const dy = this.hoveredGrid.y - this.buildStartNode.y;
        const length = Math.hypot(dx, dy);
        const maxMemberLen = this.getMaxMemberLength();
        const unitCost = this.level?.unitCost ?? 500;
        const budget = this.level?.budget ?? Infinity;
        const cost = length * unitCost;
        const isTooLong = length > maxMemberLen + 1e-6;
        const isOverBudget =
          Number.isFinite(budget) &&
          this.getCurrentTotalCost() + cost > budget + 1e-6;
        const invalid = isTooLong || isOverBudget;

        const previewColor = invalid ? pal.memberInvalid : pal.memberPreview;
        g.lineStyle(4, previewColor, invalid ? 0.65 : 0.9);
        g.beginPath();
        g.moveTo(startX, startY);
        g.lineTo(endX, endY);
        g.strokePath();

        if (pointer) {
          this.onPreviewChange?.({
            visible: true,
            screenX: pointer.x,
            screenY: pointer.y,
            lengthCells: Math.round(length * 10) / 10,
            cost: Math.round(cost),
            maxLength: maxMemberLen,
            isTooLong,
            isOverBudget,
          });
        }
      } else {
        this.onPreviewChange?.(null);
      }

      g.fillStyle(pal.memberPreview, 1.0);
      g.fillCircle(startX, startY, 7);
    } else {
      this.onPreviewChange?.(null);
    }
  }

  renderSimulationFrame(
    frame: SimulationFrame,
    _nodeMap?: ReadonlyMap<EntityId, GridPoint>,
  ) {
    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;

    // 1. 관절 핀 렌더링
    const gNodes = this.nodeGraphics;
    gNodes.clear();

    for (const pos of frame.nodePositions.values()) {
      const wx = pos.x * cellSize;
      const wy = pos.y * cellSize;
      gNodes.fillStyle(pal.nodeOuter, 1.0);
      gNodes.fillCircle(wx, wy, 6);
      gNodes.lineStyle(2, pal.nodeInner, 1.0);
      gNodes.strokeCircle(wx, wy, 6);
    }

    // 2. 막대 하중 색상 (초록 안전 → 노랑 주의 → 빨강 위험)
    const gMembers = this.memberGraphics;
    gMembers.clear();

    for (const member of this.members) {
      const stress = frame.memberStresses.get(member.id) ?? 0;
      const isBroken = frame.brokenMemberIds?.has(member.id) ?? false;

      const startPos = frame.nodePositions.get(
        `node-${member.startX}-${member.startY}`,
      ) ?? {
        x: member.startX,
        y: member.startY,
      };
      const endPos = frame.nodePositions.get(
        `node-${member.endX}-${member.endY}`,
      ) ?? {
        x: member.endX,
        y: member.endY,
      };

      const sx = startPos.x * cellSize;
      const sy = startPos.y * cellSize;
      const ex = endPos.x * cellSize;
      const ey = endPos.y * cellSize;

      if (isBroken) {
        gMembers.lineStyle(5, pal.stressDanger, 0.9);
        gMembers.beginPath();
        gMembers.moveTo(sx, sy);
        gMembers.lineTo(sx + (ex - sx) * 0.38, sy + (ey - sy) * 0.38 + 6);
        gMembers.moveTo(ex, ey);
        gMembers.lineTo(ex - (ex - sx) * 0.38, ey - (ey - sy) * 0.38 + 6);
        gMembers.strokePath();
        continue;
      }

      let color: number;
      if (stress >= 0.72) {
        color = pal.stressDanger;
      } else if (stress >= 0.38) {
        color = pal.stressWarn;
      } else {
        color = pal.stressSafe;
      }

      let offsetX = 0;
      let offsetY = 0;
      if (stress >= 0.65) {
        const shake = Math.min((stress - 0.5) * 4.5, 2.5);
        offsetX = (Math.random() - 0.5) * shake;
        offsetY = (Math.random() - 0.5) * shake;
      }

      gMembers.lineStyle(6.5, color, 1.0);
      gMembers.beginPath();
      gMembers.moveTo(sx + offsetX, sy + offsetY);
      gMembers.lineTo(ex + offsetX, ey + offsetY);
      gMembers.strokePath();
    }

    // 3. 주행 트럭 렌더링
    const gTruck = this.truckGraphics;
    gTruck.clear();

    const tx = frame.truckPosition.x * cellSize;
    const ty = frame.truckPosition.y * cellSize;
    const angle = frame.truckAngle ?? 0;

    gTruck.setPosition(tx, ty);
    gTruck.setRotation(angle);

    this.drawTruck(gTruck, 0, 4, 1, 1);
  }

  /**
   * 배송 박스 화물칸 + 클래식 픽업 캐빈을 합친 트럭.
   * (ox, oy)가 트럭 중심이며 바퀴 바닥은 oy + 21 * s 에 닿는다.
   */
  private drawTruck(
    g: Phaser.GameObjects.Graphics,
    ox: number,
    oy: number,
    s: number,
    alpha: number,
  ) {
    const pal = this.palette;
    const p = (x: number, y: number) => new Phaser.Math.Vector2(ox + x * s, oy + y * s);
    const rect = (x: number, y: number, w: number, h: number, r: number) =>
      g.fillRoundedRect(ox + x * s, oy + y * s, w * s, h * s, r * s);

    // 섀시
    g.fillStyle(0x444441, alpha);
    rect(-33, 5, 68, 6, 2);

    // 박스 화물칸 + 초록 줄무늬
    g.fillStyle(0xf4f1ea, alpha);
    rect(-33, -26, 42, 32, 3);
    g.lineStyle(1.5 * s, 0x5f5e5a, alpha);
    g.strokeRoundedRect(ox - 33 * s, oy - 26 * s, 42 * s, 32 * s, 3 * s);
    g.fillStyle(0x1d9e75, alpha);
    rect(-33, -10, 42, 6, 0);

    // 픽업 캐빈 (팔레트 색)
    g.fillStyle(pal.truckBody, alpha);
    g.fillPoints(
      [p(11, 6), p(11, -20), p(15, -24), p(23, -24), p(28, -12), p(34, -9), p(35, -6), p(35, 6)],
      true,
    );
    g.fillStyle(pal.truckCab, alpha);
    rect(11, 0, 24, 3, 1);

    // 창문 & 헤드라이트
    g.fillStyle(0xb5d4f4, alpha);
    g.fillPoints([p(14, -20), p(22, -20), p(26, -12), p(14, -12)], true);
    g.fillStyle(0xfac775, alpha);
    rect(32, -6, 3, 3, 1);

    // 바퀴 & 휠캡
    g.fillStyle(pal.truckWheel, alpha);
    g.fillCircle(ox - 20 * s, oy + 12 * s, 9 * s);
    g.fillCircle(ox + 22 * s, oy + 12 * s, 9 * s);
    g.fillStyle(0xd3d1c7, alpha);
    g.fillCircle(ox - 20 * s, oy + 12 * s, 3.5 * s);
    g.fillCircle(ox + 22 * s, oy + 12 * s, 3.5 * s);
  }

  private hasSegmentMember(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean {
    return this.members.some(
      (m) =>
        (m.startX === startX &&
          m.startY === startY &&
          m.endX === endX &&
          m.endY === endY) ||
        (m.startX === endX &&
          m.startY === endY &&
          m.endX === startX &&
          m.endY === startY),
    );
  }

  private drawDashedLine(
    g: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLen: number = 9,
    gapLen: number = 6,
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const total = Math.hypot(dx, dy);
    if (total < 1) return;
    const ux = dx / total;
    const uy = dy / total;

    g.beginPath();
    let dist = 0;
    while (dist < total) {
      const segEnd = Math.min(dist + dashLen, total);
      g.moveTo(x1 + ux * dist, y1 + uy * dist);
      g.lineTo(x1 + ux * segEnd, y1 + uy * segEnd);
      dist += dashLen + gapLen;
    }
    g.strokePath();
  }

  /** 수업 모드 점선 가이드 (그어야 할 선: 주황 점선 / 지워야 할 막대: 빨간 점선 + X 마크) */
  private drawLessonGuides() {
    if (!this.guideGraphics) return;
    const g = this.guideGraphics;
    g.clear();

    if (
      !this.showLessonGuide ||
      this.isSimulating ||
      this.lessonGuides.length === 0
    ) {
      return;
    }

    const pal = this.palette;
    const cellSize = this.gridConfig.cellSize;

    for (const seg of this.lessonGuides) {
      const exists = this.hasSegmentMember(
        seg.startX,
        seg.startY,
        seg.endX,
        seg.endY,
      );

      // 5교시(네모 상자 대각선)에서 반대쪽 대각선을 그었을 때도 가이드 완료로 인정
      const isLesson5AltDone =
        this.level?.id === 'lesson-005' &&
        seg.action === 'add' &&
        this.hasSegmentMember(11, 8, 8, 10);

      const sx = seg.startX * cellSize;
      const sy = seg.startY * cellSize;
      const ex = seg.endX * cellSize;
      const ey = seg.endY * cellSize;

      if (seg.action === 'add' && !exists && !isLesson5AltDone) {
        g.lineStyle(9, pal.memberPreview, 0.16);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.strokePath();

        g.lineStyle(3.2, pal.memberPreview, 0.9);
        this.drawDashedLine(g, sx, sy, ex, ey, 9, 6);

        g.lineStyle(2.2, pal.memberPreview, 0.85);
        g.strokeCircle(sx, sy, 10.5);
        g.strokeCircle(ex, ey, 10.5);
      } else if (seg.action === 'erase' && exists) {
        g.lineStyle(11, pal.memberInvalid, 0.25);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.strokePath();

        g.lineStyle(3.2, pal.memberInvalid, 0.95);
        this.drawDashedLine(g, sx, sy, ex, ey, 7, 5);

        const mx = (sx + ex) * 0.5;
        const my = (sy + ey) * 0.5;
        g.fillStyle(pal.memberInvalid, 1.0);
        g.fillCircle(mx, my, 8.5);
        g.lineStyle(2.2, 0xffffff, 1.0);
        g.beginPath();
        g.moveTo(mx - 3.5, my - 3.5);
        g.lineTo(mx + 3.5, my + 3.5);
        g.moveTo(mx + 3.5, my - 3.5);
        g.lineTo(mx - 3.5, my + 3.5);
        g.strokePath();
      }
    }
  }

  getCurrentDesignData() {
    return {
      nodes: Array.from(this.nodes.values()),
      members: [...this.members],
    };
  }

  loadDesignData(
    nodes: Array<{ x: number; y: number }>,
    members: MemberData[],
  ) {
    this.nodes.clear();
    for (const n of nodes) {
      this.nodes.set(`${n.x},${n.y}`, { x: n.x, y: n.y });
    }
    this.members = [...members];
    this.pruneUnusedNodes();
    if (!this.isCreated) return;
    this.drawAnchors();
    this.drawMembers();
    this.drawLessonGuides();
    this.drawNodes();
  }

  clearDesign() {
    if (this.lockedMemberIds.size > 0) {
      this.members = this.members.filter((m) => this.lockedMemberIds.has(m.id));
    } else {
      this.members = [];
    }
    this.nodes.clear();
    for (const m of this.members) {
      this.ensureNode(m.startX, m.startY);
      this.ensureNode(m.endX, m.endY);
    }
    if (!this.isCreated) return;
    this.drawAnchors();
    this.drawMembers();
    this.drawLessonGuides();
    this.drawNodes();
  }
}

export function createGameCanvas(config: GameCanvasConfig): Phaser.Game {
  const scene = new BuildScene();
  const initialTheme = config.theme ?? 'craft';
  scene.setLevel(config.level);
  scene.setGridConfig(config.grid);
  scene.setTheme(initialTheme);
  if (config.lockedMemberIds) {
    scene.setLockedMemberIds(config.lockedMemberIds);
  }
  if (config.lessonGuides) {
    scene.setLessonGuide(config.lessonGuides, config.showLessonGuide ?? true);
  }
  if (config.initialTool) {
    scene.setActiveTool(config.initialTool);
  }
  if (config.initialMembers && config.initialMembers.length > 0) {
    const initialNodes: Array<{ x: number; y: number }> = [];
    for (const m of config.initialMembers) {
      initialNodes.push({ x: m.startX, y: m.startY });
      initialNodes.push({ x: m.endX, y: m.endY });
    }
    scene.loadDesignData(initialNodes, config.initialMembers);
  }
  scene.setCallbacks({
    onMemberCreated: config.onMemberCreated,
    onMemberDeleted: config.onMemberDeleted,
    onPreviewChange: config.onPreviewChange,
    onBuildWarning: config.onBuildWarning,
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: config.parent,
    width: config.parent.clientWidth,
    height: config.parent.clientHeight,
    backgroundColor: CANVAS_PALETTES[initialTheme].paperBg,
    scene: scene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  return game;
}
