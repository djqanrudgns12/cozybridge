import Matter from 'matter-js';
import type {
  BridgeDesign,
  EntityId,
  FailureReport,
  GridPoint,
  LevelDefinition,
  SimulationFrame,
  SimulationStatus,
} from '@cozybridge/domain';
import type { BridgeSimulationEngine } from './engine-interface.js';
import { FailureDetector } from './failure-detector.js';
import { ReplayBuffer } from './replay-buffer.js';
import {
  COLLISION_CATEGORY,
  DEFAULT_TRUCK_CONFIG,
  SimulationTruck,
} from './truck.js';

export interface MatterBridgeEngineOptions {
  gravityY?: number;
  substeps?: number;
  replaySeconds?: number;
}

export interface InitialTruckSpawn {
  worldX: number;
  worldY: number;
  gridX: number;
  gridY: number;
  roadTopWorldY: number;
}

interface TruckSpawnLevelInput {
  gridConfig: { cellSize: number };
  terrain: ReadonlyArray<{ x: number; y: number }>;
  anchors: ReadonlyArray<{ x: number; y: number }>;
  truckPath: ReadonlyArray<{ x: number; y: number }>;
}

interface MemberConstraintBundle {
  beam: Matter.Body;
  pinA: Matter.Constraint;
  pinB: Matter.Constraint;
  directTruss: Matter.Constraint;
  isDeck: boolean;
  isRoadObstacle: boolean;
  isTrussBraced: boolean;
}

const BEAM_THICKNESS_PX = 8;
/** 파단 발생 후 붕괴 연출을 관찰하기 위한 후속 시뮬레이션 지속 시간(초) */
const POST_FRACTURE_DURATION_SEC = 0.45;

/**
 * 레벨 정의로부터 편집 화면 대기 트럭과 물리 시뮬레이션 출발 트럭이 공유하는
 * 정확한 초기 스폰 위치(월드 픽셀 및 격자 좌표)를 계산합니다.
 */
export function computeInitialTruckSpawn(
  level: TruckSpawnLevelInput,
): InitialTruckSpawn {
  const cellSize = level.gridConfig.cellSize;
  const startPoint = level.truckPath[0] ?? { x: 0, y: 8 };

  const minAnchorX =
    level.anchors.length > 0
      ? Math.min(...level.anchors.map((a) => a.x))
      : Infinity;

  const spawnGridX =
    Number.isFinite(minAnchorX) && minAnchorX - startPoint.x >= 3.5
      ? Math.max(startPoint.x + 1.6, minAnchorX - 2.3)
      : startPoint.x;

  const nearTileX = Math.round(spawnGridX);
  let roadGridY: number | null = null;
  for (const tile of level.terrain) {
    if (Math.abs(tile.x - nearTileX) <= 1) {
      if (roadGridY === null || tile.y < roadGridY) {
        roadGridY = tile.y;
      }
    }
  }
  if (roadGridY === null) {
    roadGridY = startPoint.y + 1;
  }

  const roadTopWorldY = roadGridY * cellSize - BEAM_THICKNESS_PX * 0.5;
  const worldX = spawnGridX * cellSize;
  const worldY =
    roadTopWorldY -
    DEFAULT_TRUCK_CONFIG.wheelRadius -
    DEFAULT_TRUCK_CONFIG.height * 0.5;

  return {
    worldX,
    worldY,
    gridX: worldX / cellSize,
    gridY: worldY / cellSize,
    roadTopWorldY,
  };
}

/**
 * Matter.js 기반 다리 물리 시뮬레이션 엔진 (PRD Part 5)
 */
export class MatterBridgeEngine implements BridgeSimulationEngine {
  private engine: Matter.Engine | null = null;
  private world: Matter.World | null = null;

  private status: SimulationStatus = 'idle';
  private failureReport: FailureReport | null = null;
  private pendingFailureReport: FailureReport | null = null;
  private postBreakTimer: number = 0;

  private replayBuffer: ReplayBuffer;
  private failureDetector: FailureDetector;
  private readonly substeps: number;

  private design: BridgeDesign | null = null;
  private level: LevelDefinition | null = null;
  private cellSize: number = 40;

  private nodeBodies = new Map<EntityId, Matter.Body>();
  private initialNodePositions = new Map<EntityId, GridPoint>();
  private anchorNodeIds = new Set<EntityId>();

  private memberBundles = new Map<EntityId, MemberConstraintBundle>();
  private memberInitialLengths = new Map<EntityId, number>();
  private memberNodeMap = new Map<EntityId, [EntityId, EntityId]>();
  private brokenMemberIds = new Set<EntityId>();
  private latestMemberStresses = new Map<EntityId, number>();

  private truck: SimulationTruck | null = null;
  private targetFinishX: number = 0;
  private dynamicFallThresholdY: number = 20;
  private canyonSpanCells: number = 9;
  private elapsedTime: number = 0;

  // 트럭 정체(갇힘) 및 도로 위 장애물 충돌 감지용
  private bestTruckX: number = -Infinity;
  private lastProgressTime: number = 0;
  private blockedContactTime: number = 0;
  private lastBlockedMemberId: EntityId | null = null;

  constructor(options: MatterBridgeEngineOptions = {}) {
    this.substeps = options.substeps ?? 4;
    this.replayBuffer = new ReplayBuffer(options.replaySeconds ?? 3.0, 60);
    this.failureDetector = new FailureDetector();
  }

  initialize(design: BridgeDesign, level: LevelDefinition): SimulationStatus {
    this.dispose();

    this.design = design;
    this.level = level;
    this.cellSize = level.gridConfig.cellSize;
    if (level.anchors.length >= 2) {
      const xs = level.anchors.map((a) => a.x);
      this.canyonSpanCells = Math.max(9, Math.max(...xs) - Math.min(...xs));
    } else {
      this.canyonSpanCells = 9;
    }
    this.elapsedTime = 0;
    this.failureReport = null;
    this.pendingFailureReport = null;
    this.postBreakTimer = 0;
    this.bestTruckX = -Infinity;
    this.lastProgressTime = 0;
    this.blockedContactTime = 0;
    this.lastBlockedMemberId = null;
    this.replayBuffer.clear();

    // 1. Matter 엔진 및 월드 생성
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
      constraintIterations: 6,
      positionIterations: 8,
      velocityIterations: 6,
    });
    this.world = this.engine.world;

    // 2. 지형(Terrain) 슬래브 생성
    this.buildTerrain(level);

    // 3. 트럭 생성 및 지형 위 중력 평형 사전 안착 (다리 부재 생성 전에 수행해 초기 튕김 0 보장)
    this.buildTruck(level);
    if (this.engine && this.truck) {
      const settleSubDtMs = (1 / 60 / this.substeps) * 1000;
      for (let i = 0; i < 16; i++) {
        Matter.Engine.update(this.engine, settleSubDtMs);
      }
      this.truck.resetMotion();
      this.bestTruckX = this.truck.getPosition().x;
    }

    // 4. 노드(절점) 생성
    this.buildNodes(design, level);

    // 5. 부재(Member) 빔 및 제약조건 생성
    this.buildMembers(design);

    this.status = 'ready';
    return this.status;
  }

  /**
   * 같은 높이(y)의 연속된 지형 타일을 매끄러운 도로 슬래브로 병합하고,
   * 절벽 끝을 앵커 위치에 정확히 정렬해 경사로/상판 진입 시 턱이나 빠짐을 방지합니다.
   */
  private buildTerrain(level: LevelDefinition): void {
    if (!this.world || level.terrain.length === 0) return;

    const cellSize = this.cellSize;
    const anchorPositions = new Set(level.anchors.map((a) => `${a.x},${a.y}`));

    const byY = new Map<number, number[]>();
    for (const tile of level.terrain) {
      const list = byY.get(tile.y) ?? [];
      list.push(tile.x);
      byY.set(tile.y, list);
    }

    const terrainBodies: Matter.Body[] = [];
    const topSurfaceOffset = BEAM_THICKNESS_PX * 0.5;
    const slabHeight = cellSize;

    for (const [y, xsRaw] of byY.entries()) {
      const xs = Array.from(new Set(xsRaw)).sort((a, b) => a - b);
      if (xs.length === 0) continue;

      let runStart = xs[0]!;
      let prev = xs[0]!;

      const flushRun = (minX: number, maxX: number) => {
        const hasLeftAnchor = anchorPositions.has(`${minX},${y}`);
        const hasRightAnchor = anchorPositions.has(`${maxX},${y}`);

        let leftWorldX: number;
        if (minX <= 0) {
          leftWorldX = (minX - 3) * cellSize;
        } else if (hasLeftAnchor) {
          leftWorldX = minX * cellSize;
        } else {
          leftWorldX = (minX - 0.5) * cellSize;
        }

        let rightWorldX: number;
        if (maxX >= level.gridConfig.width - 1) {
          rightWorldX = (maxX + 3) * cellSize;
        } else if (hasRightAnchor) {
          rightWorldX = maxX * cellSize;
        } else {
          rightWorldX = (maxX + 0.5) * cellSize;
        }

        const width = Math.max(cellSize * 0.5, rightWorldX - leftWorldX);
        const centerX = (leftWorldX + rightWorldX) * 0.5;
        const topY = y * cellSize - topSurfaceOffset;
        const centerY = topY + slabHeight * 0.5;

        const body = Matter.Bodies.rectangle(centerX, centerY, width, slabHeight, {
          isStatic: true,
          friction: 0.9,
          restitution: 0.0,
          collisionFilter: {
            category: COLLISION_CATEGORY.TERRAIN,
            mask: COLLISION_CATEGORY.TRUCK,
          },
          label: `terrain_${minX}_${maxX}_${y}`,
        });
        terrainBodies.push(body);
      };

      for (let i = 1; i < xs.length; i++) {
        const cur = xs[i]!;
        if (cur === prev + 1) {
          prev = cur;
        } else {
          flushRun(runStart, prev);
          runStart = cur;
          prev = cur;
        }
      }
      flushRun(runStart, prev);
    }

    if (terrainBodies.length > 0) {
      Matter.Composite.add(this.world, terrainBodies);
    }
  }

  private buildNodes(design: BridgeDesign, level: LevelDefinition): void {
    if (!this.world) return;

    const cellSize = this.cellSize;
    const anchorIds = new Set(level.anchors.map((a) => a.id));
    const anchorCoords = new Set(level.anchors.map((a) => `${a.x},${a.y}`));
    const terrainCoords = new Set(level.terrain.map((t) => `${t.x},${t.y}`));
    const connectedNodeIds = new Set<EntityId>();
    for (const m of design.members.values()) {
      connectedNodeIds.add(m.startNodeId);
      connectedNodeIds.add(m.endNodeId);
    }

    for (const node of design.nodes.values()) {
      const worldX = node.x * cellSize;
      const worldY = node.y * cellSize;

      const isAnchor =
        node.nodeType === 'anchor' ||
        node.nodeType === 'fixed' ||
        (node.anchorId !== undefined && anchorIds.has(node.anchorId)) ||
        anchorCoords.has(`${node.x},${node.y}`);

      const isOnTerrain = terrainCoords.has(`${node.x},${node.y}`);

      // 아무 부재와도 연결되지 않은 고아 자유 노드는 물리 월드에서 제외 (억울한 낙하 변위 실패 방지)
      if (!isAnchor && !isOnTerrain && !connectedNodeIds.has(node.id)) {
        continue;
      }

      if (isAnchor || isOnTerrain) {
        this.anchorNodeIds.add(node.id);
      }

      const body = Matter.Bodies.circle(worldX, worldY, 5, {
        isStatic: isAnchor || isOnTerrain,
        isSensor: true,
        density: 0.0012,
        friction: 0.5,
        frictionAir: 0.04,
        restitution: 0.0,
        collisionFilter: {
          group: -2,
          category: COLLISION_CATEGORY.NODE,
          mask: 0, // 초기 제공 점(앵커)을 포함한 모든 점이 자동차 주행을 절대 방해하지 않도록 완전 분리
        },
        label: `node_${node.id}`,
      });

      this.nodeBodies.set(node.id, body);
      this.initialNodePositions.set(node.id, { x: node.x, y: node.y });
      Matter.Composite.add(this.world, body);
    }
  }

  /**
   * 부재 그래프에서 각 부재가 비공선(non-collinear) 삼각형 트러스 셀로 보강되어 있는지 판별합니다.
   * 단순 일직선 연결이나 단일 줄(V자/아치 외줄)은 보강되지 않은 보로 취급되어 굽힘 하중에 취약합니다.
   */
  private computeTrussBracedMembers(design: BridgeDesign): Set<EntityId> {
    const adj = new Map<EntityId, Set<EntityId>>();
    const addEdge = (aId: EntityId, bId: EntityId) => {
      if (!adj.has(aId)) adj.set(aId, new Set());
      if (!adj.has(bId)) adj.set(bId, new Set());
      adj.get(aId)!.add(bId);
      adj.get(bId)!.add(aId);
    };

    for (const m of design.members.values()) {
      addEdge(m.startNodeId, m.endNodeId);
    }

    // 삼각형의 한 변이 중간 절점(예: 18,8)으로 분할되었으나 그 중간 절점이 다른 부재나 고정점으로 지지된 경우
    // 양 끝 절점 사이를 하나의 유효 변으로 간주해 분할된 삼각 트러스도 정당하게 보강 판정
    const collinearPairs: Array<[EntityId, EntityId]> = [];
    for (const [midId, neighbors] of adj.entries()) {
      if (neighbors.size < 2) continue;
      const midNode = design.nodes.get(midId);
      if (!midNode) continue;
      const nbList = Array.from(neighbors);
      for (let i = 0; i < nbList.length; i++) {
        const aId = nbList[i]!;
        const a = design.nodes.get(aId);
        if (!a) continue;
        for (let j = i + 1; j < nbList.length; j++) {
          const bId = nbList[j]!;
          const b = design.nodes.get(bId);
          if (!b) continue;
          const v1x = a.x - midNode.x;
          const v1y = a.y - midNode.y;
          const v2x = b.x - midNode.x;
          const v2y = b.y - midNode.y;
          const len1 = Math.hypot(v1x, v1y);
          const len2 = Math.hypot(v2x, v2y);
          if (len1 < 0.1 || len2 < 0.1) continue;
          // 반대 방향 일직선(180도)인지 확인
          const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
          if (dot > -0.995) continue;
          // 중간점이 고정점이거나 일직선 밖의 다른 부재에 의해 지지되어 있어야 유효
          const isMidBraced =
            this.anchorNodeIds.has(midId) ||
            nbList.some((otherId) => {
              if (otherId === aId || otherId === bId) return false;
              const o = design.nodes.get(otherId);
              if (!o) return false;
              const cross = Math.abs(
                (o.x - midNode.x) * v1y - (o.y - midNode.y) * v1x,
              );
              return cross > 0.1;
            });
          if (isMidBraced) {
            collinearPairs.push([aId, bId]);
          }
        }
      }
    }
    for (const [aId, bId] of collinearPairs) {
      addEdge(aId, bId);
    }

    // 같은 절벽/교각 암반에 박힌 인접 고정점들(거리 5칸 이하)은 지반 자체로 강결되어 있으므로
    // 암반 내부에 불필요한 막대를 덧대지 않아도 아치·외팔보 삼각 지지가 성립하도록 반영
    const staticAnchorIds = Array.from(this.anchorNodeIds);
    for (let i = 0; i < staticAnchorIds.length; i++) {
      const idA = staticAnchorIds[i]!;
      const nodeA = design.nodes.get(idA);
      if (!nodeA) continue;
      for (let j = i + 1; j < staticAnchorIds.length; j++) {
        const idB = staticAnchorIds[j]!;
        const nodeB = design.nodes.get(idB);
        if (!nodeB) continue;
        if (Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y) <= 5.0) {
          addEdge(idA, idB);
        }
      }
    }

    const braced = new Set<EntityId>();
    for (const m of design.members.values()) {
      const u = design.nodes.get(m.startNodeId);
      const v = design.nodes.get(m.endNodeId);
      if (!u || !v) continue;

      const lengthCells = Math.hypot(v.x - u.x, v.y - u.y);

      // 양 끝이 모두 고정점(교각)이고 짧은 경간(4칸 이하)이면 자체 지지됨
      if (
        this.anchorNodeIds.has(m.startNodeId) &&
        this.anchorNodeIds.has(m.endNodeId) &&
        lengthCells <= 4.0
      ) {
        braced.add(m.id);
        continue;
      }

      // 공통 이웃 w가 존재하며 (u, v, w)가 비공선 삼각형을 이루는지 확인
      const neighborsU = adj.get(m.startNodeId);
      const neighborsV = adj.get(m.endNodeId);
      if (neighborsU && neighborsV) {
        for (const wId of neighborsU) {
          if (!neighborsV.has(wId)) continue;
          const w = design.nodes.get(wId);
          if (!w) continue;
          const cross = Math.abs((v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x));
          if (cross > 0.1) {
            braced.add(m.id);
            break;
          }
        }
      }
    }

    return braced;
  }

  /**
   * 주행 상판(도로 바닥) 부재와 도로 위쪽을 가로막는 장애물 부재를 분류합니다.
   * - 주행 상판(deckIds): 좌우 도로를 잇는 완만한 주행 경로
   * - 도로 위 장애물(obstacleIds): 주행 상판 위로 솟아 자동차 진행을 물리적으로 가로막는 부재
   *   (유령 자동차 현상을 방지하기 위해 트럭과 실제 충돌하며 통과를 차단합니다)
   */
  private classifyDeckAndObstacleMembers(design: BridgeDesign): {
    deckIds: Set<EntityId>;
    obstacleIds: Set<EntityId>;
  } {
    const deckIds = new Set<EntityId>();
    const obstacleIds = new Set<EntityId>();
    if (!this.level) return { deckIds, obstacleIds };

    const sortedAnchors = [...this.level.anchors].sort((a, b) => a.x - b.x);
    const leftRef = sortedAnchors[0];
    const rightRef = sortedAnchors[sortedAnchors.length - 1];

    const getRoadRefY = (x: number): number => {
      if (!leftRef || !rightRef) return this.level!.gridConfig.height * 0.7;
      const span = Math.max(1, rightRef.x - leftRef.x);
      const t = Math.max(0, Math.min(1, (x - leftRef.x) / span));
      return leftRef.y + t * (rightRef.y - leftRef.y);
    };

    const MAX_UPHILL_SLOPE = 0.85;
    const MAX_DOWNHILL_SLOPE = 1.05;

    interface DrivableSeg {
      id: EntityId;
      uId: EntityId;
      vId: EntityId;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }

    const drivableEdges: DrivableSeg[] = [];
    for (const m of design.members.values()) {
      const a = design.nodes.get(m.startNodeId);
      const b = design.nodes.get(m.endNodeId);
      if (!a || !b) continue;
      const u = a.x <= b.x ? a : b;
      const v = a.x <= b.x ? b : a;
      const uId = a.x <= b.x ? m.startNodeId : m.endNodeId;
      const vId = a.x <= b.x ? m.endNodeId : m.startNodeId;
      const dx = v.x - u.x;
      if (dx < 0.1) continue;
      const slope = (v.y - u.y) / dx;
      if (slope < -MAX_UPHILL_SLOPE || slope > MAX_DOWNHILL_SLOPE) continue;
      drivableEdges.push({
        id: m.id,
        uId,
        vId,
        x1: u.x,
        y1: u.y,
        x2: v.x,
        y2: v.y,
      });
    }

    let deckReferenceSegments: DrivableSeg[] = [];

    if (leftRef && rightRef && drivableEdges.length > 0) {
      const outEdges = new Map<EntityId, DrivableSeg[]>();
      for (const seg of drivableEdges) {
        const list = outEdges.get(seg.uId) ?? [];
        list.push(seg);
        outEdges.set(seg.uId, list);
      }

      const minEndY = Math.min(leftRef.y, rightRef.y);
      const maxEndY = Math.max(leftRef.y, rightRef.y);
      const globalDy = rightRef.y - leftRef.y;

      const dist = new Map<EntityId, number>();
      const prevEdge = new Map<EntityId, DrivableSeg>();
      const nodesByX = Array.from(design.nodes.values()).sort((a, b) => a.x - b.x);

      for (const n of nodesByX) {
        if (n.x <= leftRef.x + 0.1 && Math.abs(n.y - leftRef.y) <= 1.0) {
          const startTieBreak = 0.01 * Math.hypot(n.x - leftRef.x, n.y - leftRef.y);
          dist.set(n.id, startTieBreak);
        }
      }

      for (const n of nodesByX) {
        const dU = dist.get(n.id);
        if (dU === undefined) continue;
        const edges = outEdges.get(n.id);
        if (!edges) continue;

        for (const seg of edges) {
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const len = Math.hypot(dx, dy);
          const midY = (seg.y1 + seg.y2) * 0.5;

          // 양쪽 도로 높이 범위 [minEndY, maxEndY]를 벗어나는 지붕 장애물(y < minEndY) 및 하부 트러스(y > maxEndY) 억제
          const aboveEnvelope =
            Math.max(0, minEndY - seg.y1) + Math.max(0, minEndY - seg.y2);
          const belowEnvelope =
            Math.max(0, seg.y1 - maxEndY) + Math.max(0, seg.y2 - maxEndY);
          const envelopePenalty = (aboveEnvelope * 8.0 + belowEnvelope * 6.0) * dx;

          // 전체 경사 방향과 반대로 오르내리는 불필요한 요철 억제
          const goesAgainstSlope =
            (globalDy >= -0.1 && dy < -0.05) || (globalDy <= 0.1 && dy > 0.05);
          const verticalPenalty =
            Math.abs(dy) * (goesAgainstSlope ? 7.5 : 1.5);

          // 유효 높이 범위 내에서는 더 위쪽(작은 y) 상판을 하부 현보다 우선
          const clampedMidY = Math.max(minEndY, Math.min(maxEndY, midY));
          const elevationBias = (clampedMidY - minEndY) * 0.6 * dx;

          const nextCost =
            dU + len + envelopePenalty + verticalPenalty + elevationBias;
          const prevBest = dist.get(seg.vId);
          if (prevBest === undefined || nextCost < prevBest) {
            dist.set(seg.vId, nextCost);
            prevEdge.set(seg.vId, seg);
          }
        }
      }

      // 1순위: 오른쪽 도착 도로 기준점까지 도달한 최적 경로
      let bestEndNodeId: EntityId | null = null;
      let bestEndCost = Infinity;
      for (const n of nodesByX) {
        if (n.x >= rightRef.x - 0.1 && Math.abs(n.y - rightRef.y) <= 1.0) {
          const c = dist.get(n.id);
          if (c !== undefined && c < bestEndCost) {
            bestEndCost = c;
            bestEndNodeId = n.id;
          }
        }
      }

      // 2순위: 미완성 다리라면 왼쪽 도로에서 가장 오른쪽까지 이어진 주행 상판 경로 추적
      if (!bestEndNodeId) {
        let furthestX = -Infinity;
        let furthestCost = Infinity;
        for (const n of nodesByX) {
          const c = dist.get(n.id);
          if (c === undefined || !prevEdge.has(n.id)) continue;
          if (
            n.x > furthestX + 0.05 ||
            (Math.abs(n.x - furthestX) <= 0.05 && c < furthestCost)
          ) {
            furthestX = n.x;
            furthestCost = c;
            bestEndNodeId = n.id;
          }
        }
      }

      if (bestEndNodeId) {
        const traced: DrivableSeg[] = [];
        let cur: EntityId | null = bestEndNodeId;
        const visited = new Set<EntityId>();
        while (cur && !visited.has(cur)) {
          visited.add(cur);
          const edge = prevEdge.get(cur);
          if (!edge) break;
          traced.push(edge);
          deckIds.add(edge.id);
          cur = edge.uId;
        }
        if (traced.length > 0) {
          traced.reverse();
          deckReferenceSegments = traced;
        }
      }
    }

    if (deckIds.size === 0) {
      for (const s of drivableEdges) {
        if (Math.abs((s.y1 + s.y2) * 0.5 - getRoadRefY((s.x1 + s.x2) * 0.5)) <= 1.2) {
          deckIds.add(s.id);
          deckReferenceSegments.push(s);
        }
      }
    }

    const getLocalDeckY = (x: number): number => {
      for (const d of deckReferenceSegments) {
        if (x >= d.x1 - 0.05 && x <= d.x2 + 0.05 && d.x2 - d.x1 > 0.05) {
          const t = Math.max(0, Math.min(1, (x - d.x1) / (d.x2 - d.x1)));
          return d.y1 + t * (d.y2 - d.y1);
        }
      }
      return getRoadRefY(x);
    };

    for (const m of design.members.values()) {
      if (deckIds.has(m.id)) continue;
      const a = design.nodes.get(m.startNodeId);
      const b = design.nodes.get(m.endNodeId);
      if (!a || !b) continue;

      const risesAboveDeckA = a.y < getLocalDeckY(a.x) - 0.15;
      const risesAboveDeckB = b.y < getLocalDeckY(b.x) - 0.15;
      if (risesAboveDeckA || risesAboveDeckB) {
        obstacleIds.add(m.id);
      }
    }

    return { deckIds, obstacleIds };
  }

  private isSegmentFullyOnTerrainSlab(
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): boolean {
    if (!this.level || Math.abs(ay - by) > 1e-4) return false;
    const rowY = Math.round(ay);
    if (Math.abs(ay - rowY) > 1e-4) return false;

    const terrainCoords = new Set(
      this.level.terrain.map((t) => `${t.x},${t.y}`),
    );
    const minTileX = Math.floor(Math.min(ax, bx) + 1e-4);
    const maxTileX = Math.ceil(Math.max(ax, bx) - 1e-4);
    if (maxTileX < minTileX) return false;

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (!terrainCoords.has(`${tx},${rowY}`)) {
        return false;
      }
    }
    return true;
  }

  private buildMembers(design: BridgeDesign): void {
    if (!this.world) return;

    const cellSize = this.cellSize;
    const bracedSet = this.computeTrussBracedMembers(design);
    const { deckIds, obstacleIds } = this.classifyDeckAndObstacleMembers(design);

    for (const member of design.members.values()) {
      const bodyA = this.nodeBodies.get(member.startNodeId);
      const bodyB = this.nodeBodies.get(member.endNodeId);
      if (!bodyA || !bodyB) continue;

      const startX = bodyA.position.x;
      const startY = bodyA.position.y;
      const endX = bodyB.position.x;
      const endY = bodyB.position.y;

      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 1e-3) continue;

      const angle = Math.atan2(dy, dx);
      const midX = (startX + endX) * 0.5;
      const midY = (startY + endY) * 0.5;
      const lengthCells = length / cellSize;

      this.memberInitialLengths.set(member.id, lengthCells);
      this.memberNodeMap.set(member.id, [member.startNodeId, member.endNodeId]);
      this.latestMemberStresses.set(member.id, 0);

      const nodeA = design.nodes.get(member.startNodeId);
      const nodeB = design.nodes.get(member.endNodeId);
      const embeddedInTerrain =
        nodeA !== undefined &&
        nodeB !== undefined &&
        this.isSegmentFullyOnTerrainSlab(
          nodeA.x,
          nodeA.y,
          nodeB.x,
          nodeB.y,
        );

      const isDeck = deckIds.has(member.id) && !embeddedInTerrain;
      const isRoadObstacle = obstacleIds.has(member.id) && !embeddedInTerrain;
      const isTrussBraced = bracedSet.has(member.id);

      const beam = Matter.Bodies.rectangle(midX, midY, length, BEAM_THICKNESS_PX, {
        angle,
        chamfer: { radius: 2 },
        density: 0.0007,
        friction: isDeck ? 0.9 : 0.0,
        frictionAir: 0.03,
        restitution: isRoadObstacle ? 0.12 : 0.0,
        collisionFilter: isDeck
          ? {
              category: COLLISION_CATEGORY.DECK,
              mask: COLLISION_CATEGORY.TRUCK,
            }
          : isRoadObstacle
            ? {
                category: COLLISION_CATEGORY.TRUSS,
                mask: COLLISION_CATEGORY.TRUCK,
              }
            : {
                category: COLLISION_CATEGORY.TRUSS,
                mask: 0,
              },
        label: `member_${member.id}`,
      });

      // 회전된 빔의 양 끝 월드 오프셋 벡터로 정확히 핀 연결
      const offsetX = dx * 0.5;
      const offsetY = dy * 0.5;

      const pinA = Matter.Constraint.create({
        bodyA: beam,
        pointA: { x: -offsetX, y: -offsetY },
        bodyB: bodyA,
        pointB: { x: 0, y: 0 },
        stiffness: bodyA.isStatic ? 0.98 : 0.9,
        damping: bodyA.isStatic ? 0.12 : 0.05,
        length: 0,
      });

      const pinB = Matter.Constraint.create({
        bodyA: beam,
        pointA: { x: offsetX, y: offsetY },
        bodyB: bodyB,
        pointB: { x: 0, y: 0 },
        stiffness: bodyB.isStatic ? 0.98 : 0.9,
        damping: bodyB.isStatic ? 0.12 : 0.05,
        length: 0,
      });

      const axialStiffness = Math.min(0.75, Math.max(0.28, 1.5 / Math.max(lengthCells, 2.0)));

      const directTruss = Matter.Constraint.create({
        bodyA: bodyA,
        bodyB: bodyB,
        stiffness: axialStiffness,
        damping: 0.08,
        length,
      });

      this.memberBundles.set(member.id, {
        beam,
        pinA,
        pinB,
        directTruss,
        isDeck,
        isRoadObstacle,
        isTrussBraced,
      });

      Matter.Composite.add(this.world, [beam, pinA, pinB, directTruss]);
    }
  }

  private buildTruck(level: LevelDefinition): void {
    if (!this.world) return;

    const cellSize = this.cellSize;

    const startPoint = level.truckPath[0] ?? { x: 0, y: 8 };
    const finishPoint = level.truckPath[level.truckPath.length - 1] ?? {
      x: level.gridConfig.width,
      y: 8,
    };

    this.targetFinishX = finishPoint.x * cellSize;

    const maxPathY = level.truckPath.reduce(
      (maxY, p) => Math.max(maxY, p.y),
      startPoint.y,
    );
    const lowestRoadSurfaceY = maxPathY + 1;
    this.dynamicFallThresholdY = Math.min(
      level.gridConfig.height + 2,
      lowestRoadSurfaceY + 1.8,
    );

    const spawn = computeInitialTruckSpawn(level);

    this.truck = new SimulationTruck(spawn.worldX, spawn.worldY);
    this.bestTruckX = spawn.worldX;
    this.lastProgressTime = 0;

    Matter.Composite.add(this.world, this.truck.composite);
  }

  step(deltaTime: number): SimulationFrame {
    if (!this.engine || !this.truck) {
      return this.createEmptyFrame();
    }

    if (this.status === 'ready') {
      this.status = 'running';
    }

    if (this.status !== 'running') {
      return this.captureCurrentFrame();
    }

    const subDt = deltaTime / this.substeps;
    for (let s = 0; s < this.substeps; s++) {
      this.elapsedTime += subDt;
      if (!this.lastBlockedMemberId) {
        this.truck.drive(subDt);
      }
      Matter.Engine.update(this.engine, subDt * 1000);
      this.checkRoadObstacleCollision(subDt);
      this.updateStressesAndFractures();
    }

    if (this.pendingFailureReport) {
      this.postBreakTimer += deltaTime;
    }

    const currentFrame = this.captureCurrentFrame();
    this.replayBuffer.push(currentFrame);

    this.evaluateSimulation(currentFrame);

    return currentFrame;
  }

  /**
   * 도로 위쪽에 설치된 철골 부재에 트럭이 부딪혔는지 검사합니다.
   * 유령 자동차처럼 통과하거나 지붕 위로 기어오르지 못하게 물리적으로 정지시킵니다.
   */
  private checkRoadObstacleCollision(subDt: number): void {
    if (!this.truck) return;

    if (this.lastBlockedMemberId) {
      this.blockedContactTime += subDt;
      this.latestMemberStresses.set(this.lastBlockedMemberId, 0.9);
      Matter.Body.setAngularVelocity(this.truck.wheelFront, 0);
      Matter.Body.setAngularVelocity(this.truck.wheelBack, 0);
      if (this.truck.chassis.velocity.x > 0) {
        Matter.Body.setVelocity(this.truck.chassis, {
          x: -0.2,
          y: this.truck.chassis.velocity.y,
        });
      }
      return;
    }

    const truckParts = [this.truck.chassis, this.truck.wheelFront];
    for (const [memberId, bundle] of this.memberBundles.entries()) {
      if (!bundle.isRoadObstacle || this.brokenMemberIds.has(memberId)) {
        continue;
      }
      for (const part of truckParts) {
        if (!Matter.Bounds.overlaps(part.bounds, bundle.beam.bounds)) {
          continue;
        }
        const hits = Matter.Query.collides(part, [bundle.beam]);
        if (hits.length > 0) {
          this.lastBlockedMemberId = memberId;
          this.blockedContactTime = subDt;
          this.latestMemberStresses.set(memberId, 0.9);
          Matter.Body.setAngularVelocity(this.truck.wheelFront, 0);
          Matter.Body.setAngularVelocity(this.truck.wheelBack, 0);
          Matter.Body.setVelocity(this.truck.chassis, {
            x: -0.4,
            y: this.truck.chassis.velocity.y,
          });
          return;
        }
      }
    }
  }

  /**
   * 각 부재에 걸리는 축력(인장/압축), 보 휨 모멘트, 비지지 절점 처짐 응력을 계산하고
   * 한계 응력(>= 1.0) 초과 시 물리 제약조건을 파단(Fracture)시킵니다.
   */
  private updateStressesAndFractures(): void {
    if (!this.world || !this.truck) return;

    const cellSize = this.cellSize;
    const wheels = [this.truck.wheelBack.position, this.truck.wheelFront.position];
    const newlyBrokenMembers: EntityId[] = [];
    const newlyBrokenNodes = new Set<EntityId>();
    let brokenBySag = false;

    for (const [memberId, initialLength] of this.memberInitialLengths.entries()) {
      if (this.brokenMemberIds.has(memberId)) {
        this.latestMemberStresses.set(memberId, 1.0);
        continue;
      }

      const nodes = this.memberNodeMap.get(memberId);
      const bundle = this.memberBundles.get(memberId);
      if (!nodes || !bundle || initialLength <= 0.001) continue;

      const bodyA = this.nodeBodies.get(nodes[0]);
      const bodyB = this.nodeBodies.get(nodes[1]);
      if (!bodyA || !bodyB) continue;

      const dxPx = bodyB.position.x - bodyA.position.x;
      const dyPx = bodyB.position.y - bodyA.position.y;
      const currentLengthCells = Math.hypot(dxPx, dyPx) / cellSize;

      // 1. 축 변형량 응력 (인장 및 장주 압축 좌굴 반영)
      const deltaL = Math.abs(currentLengthCells - initialLength);
      const isCompression = currentLengthCells < initialLength;
      const bucklingFactor =
        isCompression && initialLength > 3.0
          ? 1.0 + (initialLength - 3.0) * 0.2
          : 1.0;

      const axialStress = (deltaL / 0.14) * bucklingFactor;

      // 2. 트럭 바퀴 재하 시 상판 굽힘 모멘트 응력
      let bendingStress = 0;
      if (bundle.isDeck) {
        const segLenSq = dxPx * dxPx + dyPx * dyPx;
        if (segLenSq > 1) {
          for (const wPos of wheels) {
            const t =
              ((wPos.x - bodyA.position.x) * dxPx +
                (wPos.y - bodyA.position.y) * dyPx) /
              segLenSq;
            if (t > 0.02 && t < 0.98) {
              const projX = bodyA.position.x + t * dxPx;
              const projY = bodyA.position.y + t * dyPx;
              const distToBeam = Math.hypot(wPos.x - projX, wPos.y - projY);

              if (distToBeam <= 20) {
                const momentFactor = 4 * t * (1 - t);
                if (bundle.isTrussBraced) {
                  // 삼각형 트러스로 보강된 상판은 6칸 이하에서 안전하게 하중을 분산
                  const spanRatio = initialLength / 6.5;
                  bendingStress += 0.42 * Math.pow(spanRatio, 1.6) * momentFactor;
                } else {
                  // 삼각형 보강이 없는 단독/일렬 상판은 굽힘 모멘트에 직접 노출되어 파단
                  const spanRatio = Math.max(initialLength, 2.5) / 3.2;
                  bendingStress += 0.72 * Math.pow(spanRatio, 1.35) * momentFactor;
                }
              }
            }
          }
        }
      }

      // 3. 절점 처짐(변위)에 의한 접합부 이차 응력
      const initA = this.initialNodePositions.get(nodes[0]);
      const initB = this.initialNodePositions.get(nodes[1]);
      const dispA = initA
        ? Math.hypot(
            bodyA.position.x / cellSize - initA.x,
            bodyA.position.y / cellSize - initA.y,
          )
        : 0;
      const dispB = initB
        ? Math.hypot(
            bodyB.position.x / cellSize - initB.x,
            bodyB.position.y / cellSize - initB.y,
          )
        : 0;
      const maxJointSag = Math.max(dispA, dispB);
      const sagLimit = bundle.isTrussBraced
        ? Math.max(0.75, this.canyonSpanCells * 0.055)
        : 0.55;
      const sagStress = maxJointSag / sagLimit;

      const totalStress = Math.max(
        axialStress + bendingStress,
        sagStress + bendingStress * 0.35,
      );
      this.latestMemberStresses.set(memberId, Math.min(totalStress, 1.5));

      if (totalStress >= 1.0) {
        this.fractureMember(memberId);
        newlyBrokenMembers.push(memberId);
        newlyBrokenNodes.add(nodes[0]);
        newlyBrokenNodes.add(nodes[1]);
        if (sagStress >= 0.95 && sagStress > axialStress + bendingStress) {
          brokenBySag = true;
        }
      }
    }

    // 최초 파단 시 실패 원인을 기록해 두고 짧은 붕괴 연출 후 결과 전환
    if (newlyBrokenMembers.length > 0 && !this.pendingFailureReport) {
      const category = brokenBySag ? 'excessive_displacement' : 'member_deformation';
      this.pendingFailureReport = {
        category,
        eventTime: this.elapsedTime,
        nodeIds: Array.from(newlyBrokenNodes),
        memberIds: newlyBrokenMembers,
        severity: 1.0,
        confidence: 0.95,
        playerFacingMessageKey: `failure.${category}`,
      };
    }
  }

  private fractureMember(memberId: EntityId): void {
    if (!this.world || this.brokenMemberIds.has(memberId)) return;
    const bundle = this.memberBundles.get(memberId);
    if (!bundle) return;

    this.brokenMemberIds.add(memberId);
    this.latestMemberStresses.set(memberId, 1.0);

    Matter.Composite.remove(this.world, bundle.directTruss);
    Matter.Composite.remove(this.world, bundle.pinB);
    bundle.beam.collisionFilter.mask = 0;

    // 한 부재가 파단되면 인접 삼각형 보강도 상실되므로 남은 부재들의 보강 상태 재계산
    this.refreshTrussBracing();
  }

  private refreshTrussBracing(): void {
    if (!this.design) return;
    const activeMembers = new Map(
      Array.from(this.design.members.entries()).filter(
        ([id]) => !this.brokenMemberIds.has(id),
      ),
    );
    const partialDesign: BridgeDesign = {
      ...this.design,
      members: activeMembers,
    };
    const bracedSet = this.computeTrussBracedMembers(partialDesign);
    for (const [id, bundle] of this.memberBundles.entries()) {
      bundle.isTrussBraced = bracedSet.has(id);
    }
  }

  private evaluateSimulation(frame: SimulationFrame): void {
    if (!this.truck || !this.level) return;

    const cellSize = this.cellSize;
    const truckPos = this.truck.getPosition();
    const truckGridY = truckPos.y / cellSize;

    // 파단 후 붕괴 연출 시간이 지났다면 기록된 구조 실패 리포트로 확정
    if (
      this.pendingFailureReport &&
      this.postBreakTimer >= POST_FRACTURE_DURATION_SEC
    ) {
      this.triggerFailure(this.pendingFailureReport);
      return;
    }

    if (truckPos.x > this.bestTruckX + 4) {
      this.bestTruckX = truckPos.x;
      this.lastProgressTime = this.elapsedTime;
    }

    // 0. 도로 위 장애물 충돌로 가로막힌 경우 즉시 명확한 실패 사유 반환
    if (this.lastBlockedMemberId && this.blockedContactTime >= 0.45) {
      const blockedNodes = this.memberNodeMap.get(this.lastBlockedMemberId) ?? [
        '',
        '',
      ];
      this.triggerFailure({
        category: 'road_blocked',
        eventTime: this.elapsedTime,
        nodeIds: blockedNodes.filter(Boolean),
        memberIds: [this.lastBlockedMemberId],
        severity: 1.0,
        confidence: 0.98,
        playerFacingMessageKey: 'failure.road_blocked',
      });
      return;
    }

    // A. 트럭 추락, 전복, 장시간 정체 검사
    const fallThreshold = Math.min(
      this.dynamicFallThresholdY,
      this.failureDetector.getThresholds().truckFallThresholdY,
    );
    const fallReport = this.failureDetector.checkTruckFall(
      truckGridY,
      this.elapsedTime,
      fallThreshold,
    );
    const isFlipped = Math.abs(this.truck.getAngle()) > Math.PI * 0.45;
    const isStalled = this.elapsedTime - this.lastProgressTime > 2.5;

    if (fallReport || isFlipped || isStalled) {
      this.triggerFailure(
        this.pendingFailureReport ??
          fallReport ?? {
            category: 'vehicle_fall',
            eventTime: this.elapsedTime,
            nodeIds: [],
            memberIds: Array.from(this.brokenMemberIds),
            severity: 1.0,
            confidence: 1.0,
            playerFacingMessageKey: 'failure.vehicle_fall',
          },
      );
      return;
    }

    // B. 노드 과다 변위 백업 검사 (자유 낙하 중인 미연결 노드 등)
    if (!this.pendingFailureReport) {
      const displacementReport = this.failureDetector.checkNodeDisplacements(
        this.initialNodePositions,
        frame.nodePositions,
        this.elapsedTime,
        Math.max(
          this.failureDetector.getThresholds().maxNodeDisplacement,
          this.canyonSpanCells * 0.06,
        ),
      );
      if (displacementReport) {
        this.triggerFailure(displacementReport);
        return;
      }
    }

    // C. 목표 도착 판정 (파단 없이 무사히 통과했을 때만 성공)
    if (truckPos.x >= this.targetFinishX && !this.pendingFailureReport) {
      this.status = 'success';
    }
  }

  private triggerFailure(report: FailureReport): void {
    this.failureReport = report;
    this.status = 'failure';
  }

  private captureCurrentFrame(): SimulationFrame {
    const cellSize = this.cellSize;
    const nodePositions = new Map<EntityId, GridPoint>();
    const memberStresses = new Map<EntityId, number>();

    for (const [id, body] of this.nodeBodies.entries()) {
      nodePositions.set(id, {
        x: body.position.x / cellSize,
        y: body.position.y / cellSize,
      });
    }

    for (const [memberId, stress] of this.latestMemberStresses.entries()) {
      memberStresses.set(memberId, stress);
    }

    const truckGridPos = this.truck
      ? this.truck.getGridPosition(cellSize)
      : { x: 0, y: 0 };

    return {
      time: this.elapsedTime,
      nodePositions,
      memberStresses,
      truckPosition: truckGridPos,
      truckAngle: this.truck?.getAngle() ?? 0,
      brokenMemberIds: new Set(this.brokenMemberIds),
    };
  }

  private createEmptyFrame(): SimulationFrame {
    return {
      time: 0,
      nodePositions: new Map(),
      memberStresses: new Map(),
      truckPosition: { x: 0, y: 0 },
      truckAngle: 0,
      brokenMemberIds: new Set(),
    };
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  getCurrentFrame(): SimulationFrame {
    if (!this.engine || !this.truck) {
      return this.createEmptyFrame();
    }
    return this.captureCurrentFrame();
  }

  getFailureReport(): FailureReport | null {
    return this.failureReport;
  }

  getReplayFrames(): readonly SimulationFrame[] {
    return this.replayBuffer.getFrames();
  }

  reset(): void {
    if (this.design && this.level) {
      this.initialize(this.design, this.level);
    }
  }

  dispose(): void {
    if (this.engine) {
      Matter.Engine.clear(this.engine);
      this.engine = null;
      this.world = null;
    }
    this.nodeBodies.clear();
    this.initialNodePositions.clear();
    this.anchorNodeIds.clear();
    this.memberBundles.clear();
    this.memberInitialLengths.clear();
    this.memberNodeMap.clear();
    this.brokenMemberIds.clear();
    this.latestMemberStresses.clear();
    this.truck = null;
    this.status = 'idle';
    this.failureReport = null;
    this.pendingFailureReport = null;
    this.postBreakTimer = 0;
    this.blockedContactTime = 0;
    this.lastBlockedMemberId = null;
  }
}
