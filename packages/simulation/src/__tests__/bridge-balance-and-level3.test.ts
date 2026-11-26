import { describe, it, expect } from 'vitest';
import { LEVELS, SANDBOX_DEFAULT } from '@cozybridge/content';
import type { BridgeDesign, BridgeNode, LevelDefinition } from '@cozybridge/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';

function createDesignFromSegments(
  level: LevelDefinition,
  segments: Array<[{ x: number; y: number }, { x: number; y: number }]>,
  extraOrphanNodes: Array<{ x: number; y: number }> = [],
): BridgeDesign {
  const nodesMap = new Map<string, BridgeNode>();

  for (const a of level.anchors) {
    const id = `node-${a.x}-${a.y}`;
    nodesMap.set(id, {
      id,
      x: a.x,
      y: a.y,
      nodeType: 'anchor',
      anchorId: a.id,
    });
  }

  for (const orphan of extraOrphanNodes) {
    const id = `node-${orphan.x}-${orphan.y}`;
    if (!nodesMap.has(id)) {
      nodesMap.set(id, {
        id,
        x: orphan.x,
        y: orphan.y,
        nodeType: 'free',
      });
    }
  }

  const membersMap = new Map<
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

    if (!nodesMap.has(sid)) {
      const anchor = level.anchors.find((a) => a.x === s.x && a.y === s.y);
      nodesMap.set(sid, {
        id: sid,
        x: s.x,
        y: s.y,
        nodeType: anchor ? 'anchor' : 'free',
        ...(anchor ? { anchorId: anchor.id } : {}),
      });
    }

    if (!nodesMap.has(eid)) {
      const anchor = level.anchors.find((a) => a.x === e.x && a.y === e.y);
      nodesMap.set(eid, {
        id: eid,
        x: e.x,
        y: e.y,
        nodeType: anchor ? 'anchor' : 'free',
        ...(anchor ? { anchorId: anchor.id } : {}),
      });
    }

    const len = Math.hypot(e.x - s.x, e.y - s.y);
    membersMap.set(`m-${idx}`, {
      id: `m-${idx}`,
      startNodeId: sid,
      endNodeId: eid,
      materialType: 'standard',
      cost: len * level.unitCost,
    });
  });

  return {
    id: `test-${level.id}`,
    ownerId: 'user-1',
    title: '회귀 테스트 설계',
    description: '',
    mode: 'stage',
    levelId: level.id,
    visibility: 'private',
    currentVersionId: 'v1',
    nodes: nodesMap,
    members: membersMap,
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'synced',
    schemaVersion: 1,
  };
}

function simulateToCompletion(
  level: LevelDefinition,
  segments: Array<[{ x: number; y: number }, { x: number; y: number }]>,
  extraOrphanNodes: Array<{ x: number; y: number }> = [],
) {
  const engine = new MatterBridgeEngine();
  const design = createDesignFromSegments(level, segments, extraOrphanNodes);
  engine.initialize(design, level);

  for (let step = 0; step < 900; step++) {
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

describe('일직선 날먹 방지 및 3단계 경사 빠짐 버그 회귀 검증', () => {
  const level1 = LEVELS[0]!;
  const level2 = LEVELS[1]!;
  const level3 = LEVELS[2]!;

  describe('1. 모든 스테이지에서 지지 구조 없는 단순 일직선 연결은 붕괴(실패)해야 한다', () => {
    it('1단계: 단일 직선, 분할 일직선, 1칸 체인 일직선 모두 실패한다', () => {
      expect(
        simulateToCompletion(level1, [[{ x: 5, y: 9 }, { x: 14, y: 9 }]]).status,
      ).toBe('failure');

      expect(
        simulateToCompletion(level1, [
          [{ x: 5, y: 9 }, { x: 10, y: 9 }],
          [{ x: 10, y: 9 }, { x: 14, y: 9 }],
        ]).status,
      ).toBe('failure');

      expect(
        simulateToCompletion(level1, [
          [{ x: 5, y: 9 }, { x: 8, y: 9 }],
          [{ x: 8, y: 9 }, { x: 11, y: 9 }],
          [{ x: 11, y: 9 }, { x: 14, y: 9 }],
        ]).status,
      ).toBe('failure');

      const chain1: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
      for (let x = 5; x < 14; x++) {
        chain1.push([{ x, y: 9 }, { x: x + 1, y: 9 }]);
      }
      expect(simulateToCompletion(level1, chain1).status).toBe('failure');
    });

    it('2단계: 분할 일직선 및 1칸 체인 일직선 모두 실패한다', () => {
      expect(
        simulateToCompletion(level2, [
          [{ x: 4, y: 10 }, { x: 9, y: 10 }],
          [{ x: 9, y: 10 }, { x: 14, y: 10 }],
          [{ x: 14, y: 10 }, { x: 18, y: 10 }],
        ]).status,
      ).toBe('failure');

      const chain2: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
      for (let x = 4; x < 18; x++) {
        chain2.push([{ x, y: 10 }, { x: x + 1, y: 10 }]);
      }
      expect(simulateToCompletion(level2, chain2).status).toBe('failure');
    });

    it('3단계 및 샌드박스: 단순 경사 일직선 및 수평 외줄 모두 무한 정체 없이 명확히 실패한다', () => {
      const diagSingle = simulateToCompletion(level3, [
        [{ x: 5, y: 7 }, { x: 16, y: 10 }],
      ]);
      expect(diagSingle.status).toBe('failure');
      expect(diagSingle.report).not.toBeNull();

      const slopeChain = simulateToCompletion(level3, [
        [{ x: 5, y: 7 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 10 }],
      ]);
      expect(slopeChain.status).toBe('failure');

      const sandboxChain = simulateToCompletion(SANDBOX_DEFAULT, [
        [{ x: 5, y: 15 }, { x: 10, y: 15 }],
        [{ x: 10, y: 15 }, { x: 15, y: 15 }],
        [{ x: 15, y: 15 }, { x: 20, y: 15 }],
        [{ x: 20, y: 15 }, { x: 24, y: 15 }],
      ]);
      expect(sandboxChain.status).toBe('failure');
    });
  });

  describe('2. 하부 삼각형 트러스 및 교각 지지로 설계한 정상 다리는 모든 스테이지에서 안정적으로 성공해야 한다', () => {
    it('1단계: 하부 삼각형 트러스(킹포스트) 다리가 성공하며 고아 노드가 있어도 영향받지 않는다', () => {
      const kingpostUnder = simulateToCompletion(
        level1,
        [
          [{ x: 5, y: 9 }, { x: 9, y: 9 }],
          [{ x: 9, y: 9 }, { x: 14, y: 9 }],
          [{ x: 5, y: 9 }, { x: 9, y: 11 }],
          [{ x: 9, y: 9 }, { x: 9, y: 11 }],
          [{ x: 14, y: 9 }, { x: 9, y: 11 }],
        ],
        [{ x: 2, y: 3 }], // 미연결 고아 노드
      );
      expect(kingpostUnder.status).toBe('success');
    });

    it('2단계: 연속 하부 트러스 다리가 성공한다', () => {
      const deckTruss = simulateToCompletion(level2, [
        [{ x: 4, y: 10 }, { x: 8, y: 10 }],
        [{ x: 8, y: 10 }, { x: 11, y: 10 }],
        [{ x: 11, y: 10 }, { x: 14, y: 10 }],
        [{ x: 14, y: 10 }, { x: 18, y: 10 }],
        [{ x: 4, y: 10 }, { x: 8, y: 12 }],
        [{ x: 8, y: 10 }, { x: 8, y: 12 }],
        [{ x: 8, y: 12 }, { x: 11, y: 10 }],
        [{ x: 8, y: 12 }, { x: 11, y: 12 }],
        [{ x: 11, y: 10 }, { x: 11, y: 12 }],
        [{ x: 11, y: 12 }, { x: 14, y: 10 }],
        [{ x: 11, y: 12 }, { x: 14, y: 12 }],
        [{ x: 14, y: 10 }, { x: 14, y: 12 }],
        [{ x: 14, y: 12 }, { x: 18, y: 10 }],
      ]);
      expect(deckTruss.status).toBe('success');
    });

    it('3단계: 경사 상판 + 바닥 교각 트러스에서 빠짐 없이 매끄럽게 성공한다', () => {
      const pierBridge = simulateToCompletion(level3, [
        [{ x: 5, y: 7 }, { x: 9, y: 8 }],
        [{ x: 9, y: 8 }, { x: 13, y: 9 }],
        [{ x: 13, y: 9 }, { x: 16, y: 10 }],
        [{ x: 10, y: 14 }, { x: 10, y: 10 }],
        [{ x: 10, y: 10 }, { x: 9, y: 8 }],
        [{ x: 10, y: 10 }, { x: 13, y: 9 }],
        [{ x: 5, y: 7 }, { x: 10, y: 10 }],
        [{ x: 10, y: 10 }, { x: 16, y: 10 }],
      ]);
      expect(pierBridge.status).toBe('success');
    });
  });

  describe('3. 유령 자동차 방지 — 도로 위를 가로막는 구조물은 트럭이 통과하지 못하고 충돌 실패해야 한다', () => {
    it('도로 위에 삼각형(△)이나 세로 기둥을 세우면 트럭이 뚫고 지나가지 못하고 road_blocked 실패가 발생한다', () => {
      const overTrussBlocked = simulateToCompletion(level1, [
        [{ x: 5, y: 9 }, { x: 9, y: 9 }],
        [{ x: 9, y: 9 }, { x: 14, y: 9 }],
        // 하부는 튼튼하지만 도로 위에 삼각형 장애물을 세운 경우
        [{ x: 5, y: 9 }, { x: 9, y: 11 }],
        [{ x: 9, y: 9 }, { x: 9, y: 11 }],
        [{ x: 14, y: 9 }, { x: 9, y: 11 }],
        [{ x: 5, y: 9 }, { x: 7, y: 7 }],
        [{ x: 7, y: 7 }, { x: 9, y: 9 }],
      ]);
      expect(overTrussBlocked.status).toBe('failure');
      expect(overTrussBlocked.report?.category).toBe('road_blocked');

      const middlePostBlocked = simulateToCompletion(level1, [
        [{ x: 5, y: 9 }, { x: 9, y: 9 }],
        [{ x: 9, y: 9 }, { x: 14, y: 9 }],
        [{ x: 5, y: 9 }, { x: 9, y: 11 }],
        [{ x: 9, y: 9 }, { x: 9, y: 11 }],
        [{ x: 14, y: 9 }, { x: 9, y: 11 }],
        // 도로 한가운데 세로 기둥 장애물
        [{ x: 9, y: 9 }, { x: 9, y: 7 }],
      ]);
      expect(middlePostBlocked.status).toBe('failure');
      expect(middlePostBlocked.report?.category).toBe('road_blocked');
    });
  });
});
