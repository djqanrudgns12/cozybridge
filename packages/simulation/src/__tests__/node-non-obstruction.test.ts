import Matter from 'matter-js';
import { describe, it, expect } from 'vitest';
import { LEVELS, SANDBOX_DEFAULT } from '@cozybridge/content';
import type { BridgeDesign, BridgeNode, LevelDefinition } from '@cozybridge/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';
import { COLLISION_CATEGORY, SimulationTruck } from '../truck.js';

function buildDesign(
  level: LevelDefinition,
  segments: Array<[{ x: number; y: number }, { x: number; y: number }]>,
  extraNodes: Array<{ x: number; y: number }> = [],
): BridgeDesign {
  const nodes = new Map<string, BridgeNode>();

  // 모든 단계에서 처음 주어지는 초기 점(앵커)을 항상 포함
  for (const anchor of level.anchors) {
    const id = `node-${anchor.x}-${anchor.y}`;
    nodes.set(id, {
      id,
      x: anchor.x,
      y: anchor.y,
      nodeType: 'anchor',
      anchorId: anchor.id,
    });
  }

  for (const pt of extraNodes) {
    const id = `node-${pt.x}-${pt.y}`;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        x: pt.x,
        y: pt.y,
        nodeType: 'free',
      });
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

  segments.forEach(([s, e], idx) => {
    const sid = `node-${s.x}-${s.y}`;
    const eid = `node-${e.x}-${e.y}`;

    if (!nodes.has(sid)) {
      nodes.set(sid, { id: sid, x: s.x, y: s.y, nodeType: 'free' });
    }
    if (!nodes.has(eid)) {
      nodes.set(eid, { id: eid, x: e.x, y: e.y, nodeType: 'free' });
    }

    const len = Math.hypot(e.x - s.x, e.y - s.y);
    members.set(`m-${idx}`, {
      id: `m-${idx}`,
      startNodeId: sid,
      endNodeId: eid,
      materialType: 'standard',
      cost: len * level.unitCost,
    });
  });

  return {
    id: `non-obstruction-${level.id}`,
    ownerId: 'user-1',
    title: '초기 점 비간섭 테스트',
    description: '',
    mode: level.id === 'sandbox-default' ? 'sandbox' : 'stage',
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

function runSimulation(
  level: LevelDefinition,
  segments: Array<[{ x: number; y: number }, { x: number; y: number }]>,
  extraNodes: Array<{ x: number; y: number }> = [],
) {
  const engine = new MatterBridgeEngine();
  const design = buildDesign(level, segments, extraNodes);
  engine.initialize(design, level);

  for (let i = 0; i < 1200; i++) {
    engine.step(1 / 60);
    if (engine.getStatus() !== 'running') {
      break;
    }
  }

  const status = engine.getStatus();
  const report = engine.getFailureReport();
  engine.dispose();
  return { status, report };
}

describe('모든 단계에서 초기 제공 점 및 절점이 자동차 주행을 방해하지 않아야 한다', () => {
  const allStages: LevelDefinition[] = [...LEVELS, SANDBOX_DEFAULT];

  it('전 단계(1~3단계 및 샌드박스)에서 초기 점과 일반 점은 트럭 차체/바퀴와 물리 충돌하지 않는다', () => {
    const truck = new SimulationTruck(100, 100);

    for (const stage of allStages) {
      const firstAnchor = stage.anchors[0]!;
      const engine = new MatterBridgeEngine();
      const design = buildDesign(
        stage,
        [
          [
            { x: firstAnchor.x, y: firstAnchor.y },
            { x: firstAnchor.x + 2, y: firstAnchor.y },
          ],
        ],
        [{ x: firstAnchor.x - 1, y: firstAnchor.y - 1 }],
      );
      engine.initialize(design, stage);

      // 트럭의 충돌 마스크에 NODE 카테고리가 포함되지 않는지 확인
      expect(truck.chassis.collisionFilter.mask! & COLLISION_CATEGORY.NODE).toBe(0);
      expect(truck.wheelFront.collisionFilter.mask! & COLLISION_CATEGORY.NODE).toBe(0);
      expect(truck.wheelBack.collisionFilter.mask! & COLLISION_CATEGORY.NODE).toBe(0);

      // 실제 생성된 노드 바디가 센서이며 트럭과 충돌 불가능한지 확인
      const nodeBodies = (
        engine as unknown as { nodeBodies: Map<string, Matter.Body> }
      ).nodeBodies;
      expect(nodeBodies.size).toBeGreaterThanOrEqual(stage.anchors.length);

      for (const nodeBody of nodeBodies.values()) {
        expect(nodeBody.isSensor).toBe(true);
        expect(nodeBody.collisionFilter.mask).toBe(0);
        expect(
          Matter.Detector.canCollide(
            nodeBody.collisionFilter,
            truck.wheelFront.collisionFilter,
          ),
        ).toBe(false);
        expect(
          Matter.Detector.canCollide(
            nodeBody.collisionFilter,
            truck.chassis.collisionFilter,
          ),
        ).toBe(false);
      }

      engine.dispose();
    }
  });

  it('1단계: 초기 점(5,9 / 14,9)에서 시작하거나 바깥 도로(4,9 ~ 15,9)에서 시작해 초기 점 위를 그대로 통과해도 방해 없이 성공한다', () => {
    const level1 = LEVELS[0]!;

    // 초기 점(5,9), (14,9)에 직접 연결하지 않고 바깥 도로 타일(4,9)~(15,9)에서 연결하여 초기 점 위를 관통 주행
    const overInitialDots = runSimulation(
      level1,
      [
        [{ x: 4, y: 9 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 9 }],
        [{ x: 12, y: 9 }, { x: 15, y: 9 }],
        [{ x: 4, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 9 }, { x: 8, y: 11 }],
        [{ x: 8, y: 11 }, { x: 12, y: 9 }],
        [{ x: 8, y: 11 }, { x: 12, y: 11 }],
        [{ x: 12, y: 9 }, { x: 12, y: 11 }],
        [{ x: 12, y: 11 }, { x: 15, y: 9 }],
      ],
      [
        { x: 3, y: 9 },
        { x: 5, y: 8 },
        { x: 14, y: 8 },
      ],
    );
    expect(overInitialDots.status).toBe('success');

    // 초기 점(5,9), (14,9)에서 직접 연결한 하부 킹포스트 트러스 주행 시에도 진입/진출 걸림 없음
    const fromInitialDots = runSimulation(
      level1,
      [
        [{ x: 5, y: 9 }, { x: 9.5, y: 9 }],
        [{ x: 9.5, y: 9 }, { x: 14, y: 9 }],
        [{ x: 5, y: 9 }, { x: 9.5, y: 11 }],
        [{ x: 9.5, y: 11 }, { x: 14, y: 9 }],
        [{ x: 9.5, y: 9 }, { x: 9.5, y: 11 }],
      ],
      [
        { x: 2, y: 9 },
        { x: 17, y: 9 },
      ],
    );
    expect(fromInitialDots.status).toBe('success');
  });

  it('2단계: 초기 점(4,10 / 18,10) 바깥 도로(3,10 ~ 19,10)에서 연결해 초기 점을 관통 주행해도 성공한다', () => {
    const level2 = LEVELS[1]!;

    const result = runSimulation(
      level2,
      [
        [{ x: 3, y: 10 }, { x: 7, y: 10 }],
        [{ x: 7, y: 10 }, { x: 11, y: 10 }],
        [{ x: 11, y: 10 }, { x: 15, y: 10 }],
        [{ x: 15, y: 10 }, { x: 19, y: 10 }],
        [{ x: 3, y: 10 }, { x: 7, y: 12 }],
        [{ x: 7, y: 10 }, { x: 7, y: 12 }],
        [{ x: 7, y: 12 }, { x: 11, y: 10 }],
        [{ x: 7, y: 12 }, { x: 11, y: 12 }],
        [{ x: 11, y: 10 }, { x: 11, y: 12 }],
        [{ x: 11, y: 12 }, { x: 15, y: 10 }],
        [{ x: 11, y: 12 }, { x: 15, y: 12 }],
        [{ x: 15, y: 10 }, { x: 15, y: 12 }],
        [{ x: 15, y: 12 }, { x: 19, y: 10 }],
      ],
      [
        { x: 2, y: 10 },
        { x: 4, y: 9 },
        { x: 18, y: 9 },
      ],
    );
    expect(result.status).toBe('success');
  });

  it('3단계: 초기 점(5,7 / 16,10 / 10,14) 주변 관통 주행 및 수평 연장 상판 + 하부 트러스 구조에서도 방해 없이 성공한다', () => {
    const level3 = LEVELS[2]!;

    const result = runSimulation(
      level3,
      [
        [{ x: 4, y: 7 }, { x: 8, y: 7 }],
        [{ x: 8, y: 7 }, { x: 12, y: 8 }],
        [{ x: 12, y: 8 }, { x: 16, y: 10 }],
        [{ x: 16, y: 10 }, { x: 17, y: 10 }],
        [{ x: 4, y: 7 }, { x: 8, y: 9 }],
        [{ x: 8, y: 7 }, { x: 8, y: 9 }],
        [{ x: 8, y: 9 }, { x: 12, y: 8 }],
        [{ x: 8, y: 9 }, { x: 12, y: 10 }],
        [{ x: 12, y: 8 }, { x: 12, y: 10 }],
        [{ x: 12, y: 10 }, { x: 16, y: 10 }],
        [{ x: 10, y: 14 }, { x: 8, y: 9 }],
        [{ x: 10, y: 14 }, { x: 12, y: 10 }],
      ],
      [
        { x: 5, y: 6 },
        { x: 16, y: 9 },
      ],
    );
    expect(result.status).toBe('success');
  });

  it('샌드박스: 초기 점(5,15 / 24,15) 바깥 도로(4,15 ~ 25,15)에서 하부 트러스로 연결해 초기 점을 관통 주행해도 성공한다', () => {
    const xs = [4, 8, 12, 16, 20, 24, 25];
    const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];

    for (let i = 0; i < xs.length - 1; i++) {
      const x1 = xs[i]!;
      const x2 = xs[i + 1]!;
      segments.push([{ x: x1, y: 15 }, { x: x2, y: 15 }]);
    }

    const bottomXs = [6, 10, 14, 18, 22];
    for (let i = 0; i < bottomXs.length; i++) {
      const x1 = xs[i]!;
      const x2 = xs[i + 1]!;
      const xm = bottomXs[i]!;
      segments.push([{ x: x1, y: 15 }, { x: xm, y: 18 }]);
      segments.push([{ x: xm, y: 18 }, { x: x2, y: 15 }]);
      if (i > 0) {
        segments.push([{ x: bottomXs[i - 1]!, y: 18 }, { x: xm, y: 18 }]);
      }
    }

    const result = runSimulation(SANDBOX_DEFAULT, segments, [
      { x: 2, y: 15 },
      { x: 5, y: 14 },
      { x: 24, y: 14 },
      { x: 27, y: 15 },
    ]);
    expect(result).toEqual({ status: 'success', report: null });
  });
});
