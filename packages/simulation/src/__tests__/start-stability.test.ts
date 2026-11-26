import { describe, expect, it } from 'vitest';
import {
  LESSONS,
  LEVELS,
  SANDBOX_DEFAULT,
  type LevelDefinition,
} from '@cozybridge/content';
import type { BridgeDesign, BridgeNode } from '@cozybridge/domain';
import {
  computeInitialTruckSpawn,
  MatterBridgeEngine,
} from '../matter-bridge-engine.js';
import type { SimulationTruck } from '../truck.js';

type Seg = [{ x: number; y: number }, { x: number; y: number }];

function makeDesign(
  level: LevelDefinition,
  segments: Seg[],
  extraNodes: Array<{ x: number; y: number }> = [],
): BridgeDesign {
  const nodes = new Map<string, BridgeNode>();
  for (const a of level.anchors) {
    const id = `node-${a.x}-${a.y}`;
    nodes.set(id, { id, x: a.x, y: a.y, nodeType: 'anchor', anchorId: a.id });
  }
  for (const p of extraNodes) {
    const id = `node-${p.x}-${p.y}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, x: p.x, y: p.y, nodeType: 'free' });
    }
  }
  const members = new Map<
    string,
    {
      id: string;
      startNodeId: string;
      endNodeId: string;
      materialType: 'standard';
      cost: number;
    }
  >();
  segments.forEach(([s, e], i) => {
    const sid = `node-${s.x}-${s.y}`;
    const eid = `node-${e.x}-${e.y}`;
    if (!nodes.has(sid)) {
      nodes.set(sid, { id: sid, x: s.x, y: s.y, nodeType: 'free' });
    }
    if (!nodes.has(eid)) {
      nodes.set(eid, { id: eid, x: e.x, y: e.y, nodeType: 'free' });
    }
    members.set(`m-${i}`, {
      id: `m-${i}`,
      startNodeId: sid,
      endNodeId: eid,
      materialType: 'standard',
      cost: Math.hypot(e.x - s.x, e.y - s.y) * level.unitCost,
    });
  });

  return {
    id: `start-stability-${level.id}`,
    ownerId: 'test-user',
    title: 'Start Stability Test',
    description: '',
    mode: 'stage',
    levelId: level.id,
    visibility: 'private',
    currentVersionId: 'v1',
    nodes,
    members,
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'synced',
    schemaVersion: 1,
  };
}

function buildMinimalAnchorSpan(level: LevelDefinition): Seg[] {
  const sorted = [...level.anchors].sort((a, b) => a.x - b.x);
  if (sorted.length < 2) return [];
  const a0 = sorted[0]!;
  const a1 = sorted[1]!;
  const midX = Math.round((a0.x + a1.x) * 0.5);
  const midY = a0.y;
  return [
    [{ x: a0.x, y: a0.y }, { x: midX, y: midY }],
    [{ x: midX, y: midY }, { x: a1.x, y: a1.y }],
    [{ x: a0.x, y: a0.y }, { x: midX, y: midY + 2 }],
    [{ x: midX, y: midY }, { x: midX, y: midY + 2 }],
    [{ x: midX, y: midY + 2 }, { x: a1.x, y: a1.y }],
  ];
}

function measureStartZoneMotion(
  level: LevelDefinition,
  segments: Seg[],
  options: { maxFrames?: number; stopAfterBridgeEntry?: boolean } = {},
) {
  const { maxFrames = 720, stopAfterBridgeEntry = false } = options;
  const engine = new MatterBridgeEngine();
  engine.initialize(makeDesign(level, segments), level);
  const initFrame = engine.getCurrentFrame();
  const spawn = computeInitialTruckSpawn(level);
  const truck = (engine as unknown as { truck: SimulationTruck }).truck;

  const sortedAnchors = [...level.anchors].sort((a, b) => a.x - b.x);
  const leftAnchorWorldX =
    (sortedAnchors[0]?.x ?? 5) * level.gridConfig.cellSize;

  let minRoadY = Infinity;
  let maxRoadY = -Infinity;
  let minRoadDeg = Infinity;
  let maxRoadDeg = -Infinity;
  let roadVyFlips = 0;
  let prevRoadVy = 0;

  let maxStartZoneDeg = 0;
  let maxBridgeEntryDeg = 0;

  for (let f = 1; f <= maxFrames; f++) {
    engine.step(1 / 60);
    const x = truck.chassis.position.x;
    const y = truck.chassis.position.y;
    const deg = truck.chassis.angle * (180 / Math.PI);
    const vy = truck.chassis.velocity.y;

    // 왼쪽 출발 도로 구간 (앵커 진입 직전까지)
    if (x <= leftAnchorWorldX - 24) {
      minRoadY = Math.min(minRoadY, y);
      maxRoadY = Math.max(maxRoadY, y);
      minRoadDeg = Math.min(minRoadDeg, deg);
      maxRoadDeg = Math.max(maxRoadDeg, deg);

      if (
        Math.abs(vy) > 0.02 &&
        Math.abs(prevRoadVy) > 0.02 &&
        Math.sign(vy) !== Math.sign(prevRoadVy)
      ) {
        roadVyFlips++;
      }
      if (Math.abs(vy) > 0.02) {
        prevRoadVy = vy;
      }
    }

    // 출발 지점 ~ 앞바퀴가 왼쪽 절벽 끝(앵커)을 벗어나기 직전 구간 전체 기울기 확인 (지형 위 부재 턱 걸림 검증)
    if (x + 21 <= leftAnchorWorldX) {
      maxStartZoneDeg = Math.max(maxStartZoneDeg, Math.abs(deg));
    }

    // 다리 진입부 구간 (왼쪽 앵커 부근 +-30px, 앞바퀴가 교량 상판에 올라탄 구간)
    if (Math.abs(x - leftAnchorWorldX) <= 30) {
      maxBridgeEntryDeg = Math.max(maxBridgeEntryDeg, Math.abs(deg));
    }

    if (engine.getStatus() !== 'running') break;
    if (stopAfterBridgeEntry && x > leftAnchorWorldX + 40) break;
  }

  const finalStatus = engine.getStatus();
  const wheelBackVertices = truck.wheelBack.vertices.length;
  const wheelFrontVertices = truck.wheelFront.vertices.length;
  engine.dispose();

  return {
    initFrame,
    spawn,
    wheelBackVertices,
    wheelFrontVertices,
    roadYRangePx: maxRoadY > minRoadY ? maxRoadY - minRoadY : 0,
    roadPitchRangeDeg: maxRoadDeg > minRoadDeg ? maxRoadDeg - minRoadDeg : 0,
    roadVyFlips,
    maxStartZoneDeg,
    maxBridgeEntryDeg,
    finalStatus,
  };
}

describe('출발 지점 트럭 흔들림 방지 회귀 검증', () => {
  it('트럭 바퀴가 10각형이 아닌 64각형 매끄러운 원형 폴리곤으로 생성되어야 한다', () => {
    const level = LEVELS[0]!;
    const result = measureStartZoneMotion(level, buildMinimalAnchorSpan(level), {
      maxFrames: 10,
    });

    expect(result.wheelBackVertices).toBe(64);
    expect(result.wheelFrontVertices).toBe(64);
  });

  it('모든 스테이지·샌드박스·수업 레벨에서 편집 대기 좌표와 t=0 물리 스폰 좌표가 일치하고 출발 도로 흔들림이 없어야 한다', () => {
    const allLevels: LevelDefinition[] = [
      ...LEVELS,
      SANDBOX_DEFAULT,
      ...LESSONS.map((l) => l.level),
    ];

    for (const level of allLevels) {
      const result = measureStartZoneMotion(
        level,
        buildMinimalAnchorSpan(level),
        { stopAfterBridgeEntry: true },
      );

      // 편집 화면 대기 트럭과 t=0 시뮬레이션 트럭 위치 일치 (< 0.4px 오차 이내)
      expect(
        Math.abs(result.initFrame.truckPosition.x - result.spawn.gridX),
        `${level.id} 초기 X 좌표 불일치`,
      ).toBeLessThan(0.01);
      expect(
        Math.abs(result.initFrame.truckPosition.y - result.spawn.gridY),
        `${level.id} 초기 Y 좌표 불일치`,
      ).toBeLessThan(0.01);
      expect(
        Math.abs(result.initFrame.truckAngle ?? 0),
        `${level.id} 초기 기울기 불일치`,
      ).toBeLessThan(0.005);

      // 출발 평지 주행 중 상하 속도 부호 반전(통통 튀는 진동) 0회
      expect(
        result.roadVyFlips,
        `${level.id} 출발 도로 상하 진동 발생`,
      ).toBe(0);
      // 출발 평지 주행 중 차체 상하 변위 0.3px 미만 & 피치 흔들림 0.2도 미만
      expect(
        result.roadYRangePx,
        `${level.id} 출발 도로 상하 흔들림 과다`,
      ).toBeLessThan(0.3);
      expect(
        result.roadPitchRangeDeg,
        `${level.id} 출발 도로 각도 흔들림 과다`,
      ).toBeLessThan(0.2);
    }
  });

  it('출발 도로 위 중복 부재나 앵커 진입부 다양한 설계에서도 출발 구간 튕김 없이 통과해야 한다', () => {
    const l1 = LEVELS[0]!;

    // 1. 왼쪽 도로 (4,9)에서 상판을 시작해 지형과 겹치는 경우
    const overTerrain = measureStartZoneMotion(l1, [
      [{ x: 4, y: 9 }, { x: 8, y: 9 }],
      [{ x: 8, y: 9 }, { x: 12, y: 9 }],
      [{ x: 12, y: 9 }, { x: 15, y: 9 }],
      [{ x: 4, y: 9 }, { x: 8, y: 11 }],
      [{ x: 8, y: 9 }, { x: 8, y: 11 }],
      [{ x: 8, y: 11 }, { x: 12, y: 9 }],
      [{ x: 8, y: 11 }, { x: 12, y: 11 }],
      [{ x: 12, y: 9 }, { x: 12, y: 11 }],
      [{ x: 12, y: 11 }, { x: 15, y: 9 }],
    ]);
    expect(overTerrain.finalStatus).toBe('success');
    expect(overTerrain.roadVyFlips).toBe(0);
    expect(overTerrain.maxStartZoneDeg).toBeLessThan(0.35);
    expect(overTerrain.maxBridgeEntryDeg).toBeLessThan(2.0);

    // 2. 출발 도로 (1,9)~(5,9) 위에 부재를 여러 개 깔아둔 경우
    const roadSegments = measureStartZoneMotion(l1, [
      [{ x: 1, y: 9 }, { x: 3, y: 9 }],
      [{ x: 3, y: 9 }, { x: 5, y: 9 }],
      [{ x: 5, y: 9 }, { x: 9, y: 9 }],
      [{ x: 9, y: 9 }, { x: 14, y: 9 }],
      [{ x: 5, y: 9 }, { x: 9, y: 11 }],
      [{ x: 9, y: 9 }, { x: 9, y: 11 }],
      [{ x: 14, y: 9 }, { x: 9, y: 11 }],
    ]);
    expect(roadSegments.finalStatus).toBe('success');
    expect(roadSegments.roadVyFlips).toBe(0);
    expect(roadSegments.maxStartZoneDeg).toBeLessThan(0.35);
    expect(roadSegments.maxBridgeEntryDeg).toBeLessThan(2.0);

    // 3. 왼쪽 지형 (2,9)에서 하부 버팀대를 연결한 경우
    const backStay = measureStartZoneMotion(l1, [
      [{ x: 2, y: 9 }, { x: 7, y: 11 }],
      [{ x: 5, y: 9 }, { x: 9, y: 9 }],
      [{ x: 9, y: 9 }, { x: 14, y: 9 }],
      [{ x: 5, y: 9 }, { x: 7, y: 11 }],
      [{ x: 7, y: 11 }, { x: 9, y: 9 }],
      [{ x: 9, y: 9 }, { x: 11, y: 11 }],
      [{ x: 7, y: 11 }, { x: 11, y: 11 }],
      [{ x: 11, y: 11 }, { x: 14, y: 9 }],
    ]);
    expect(backStay.finalStatus).toBe('success');
    expect(backStay.roadVyFlips).toBe(0);
    expect(backStay.maxStartZoneDeg).toBeLessThan(0.35);
    expect(backStay.maxBridgeEntryDeg).toBeLessThan(2.0);
  });
});
