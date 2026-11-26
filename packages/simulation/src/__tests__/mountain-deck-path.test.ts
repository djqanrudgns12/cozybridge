import { describe, it, expect } from 'vitest';
import { LEVELS } from '@cozybridge/content';
import type { BridgeDesign, BridgeNode, LevelDefinition } from '@cozybridge/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';

type P = { x: number; y: number };

function buildDesign(level: LevelDefinition, segments: Array<[P, P]>): BridgeDesign {
  const nodes = new Map<string, BridgeNode>();
  const ensure = (p: P) => {
    const id = `node-${p.x}-${p.y}`;
    if (nodes.has(id)) return id;
    const anchor = level.anchors.find((a) => a.x === p.x && a.y === p.y);
    nodes.set(id, {
      id,
      x: p.x,
      y: p.y,
      nodeType: anchor ? 'anchor' : 'free',
      ...(anchor ? { anchorId: anchor.id } : {}),
    });
    return id;
  };
  for (const a of level.anchors) ensure(a);
  const members = new Map<
    string,
    { id: string; startNodeId: string; endNodeId: string; materialType: 'standard'; cost: number }
  >();
  segments.forEach(([s, e], i) => {
    members.set(`m-${i}`, {
      id: `m-${i}`,
      startNodeId: ensure(s),
      endNodeId: ensure(e),
      materialType: 'standard',
      cost: Math.hypot(e.x - s.x, e.y - s.y) * level.unitCost,
    });
  });
  return {
    id: 'test-mountain',
    ownerId: 'user-1',
    title: '산악 철교 회귀 테스트',
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

describe('높낮이가 다른 상판 경로 판별', () => {
  it('가파른 산악 철교: 평평한 상판 뒤 내리막으로 내려오는 다리에서 트럭이 막히지 않는다', () => {
    const level = LEVELS.find((l) => l.title === '가파른 산악 철교')!;
    const design = buildDesign(level, [
      [{ x: 5, y: 6 }, { x: 10, y: 6 }],
      [{ x: 10, y: 6 }, { x: 15, y: 6 }],
      [{ x: 15, y: 6 }, { x: 18, y: 7 }],
      [{ x: 18, y: 7 }, { x: 21, y: 10 }],
      [{ x: 5, y: 6 }, { x: 6, y: 9 }],
      [{ x: 6, y: 9 }, { x: 10, y: 6 }],
      [{ x: 6, y: 9 }, { x: 9, y: 7 }],
      [{ x: 9, y: 7 }, { x: 13, y: 8 }],
      [{ x: 10, y: 6 }, { x: 13, y: 8 }],
      [{ x: 13, y: 8 }, { x: 15, y: 6 }],
      [{ x: 13, y: 8 }, { x: 15, y: 10 }],
      [{ x: 15, y: 6 }, { x: 15, y: 10 }],
      [{ x: 15, y: 10 }, { x: 18, y: 7 }],
      [{ x: 15, y: 10 }, { x: 19, y: 10 }],
      [{ x: 15, y: 10 }, { x: 13, y: 13 }],
      [{ x: 18, y: 7 }, { x: 19, y: 10 }],
    ]);
    const engine = new MatterBridgeEngine();
    engine.initialize(design, level);
    for (let i = 0; i < 1200 && engine.getStatus() !== 'failure' && engine.getStatus() !== 'success'; i++) {
      engine.step(1 / 60);
    }
    const report = engine.getFailureReport();
    const x = engine.getCurrentFrame().truckPosition.x;
    const status = engine.getStatus();
    engine.dispose();
    expect(report?.category, `truck x=${x.toFixed(2)}`).not.toBe('road_blocked');
    expect(status).toBe('success');
  });

  it('바위섬 오르막 강: 평지 상판 + 하부 현 + 오르막 경사(-2/3) 다리에서 트럭이 상판을 뚫고 빠지지 않는다', () => {
    const level = LEVELS.find((l) => l.id === 'level-017')!;
    const design = buildDesign(level, [
      // 상판 주행 경로: (4,10) -> (10,10) -> (12,10) -> (15,9) -> (18,7)
      [{ x: 4, y: 10 }, { x: 10, y: 10 }],
      [{ x: 10, y: 10 }, { x: 12, y: 10 }],
      [{ x: 12, y: 10 }, { x: 15, y: 9 }],
      [{ x: 15, y: 9 }, { x: 18, y: 7 }],
      // 좌측 하부 트러스
      [{ x: 4, y: 10 }, { x: 4, y: 11 }],
      [{ x: 4, y: 10 }, { x: 7, y: 11 }],
      [{ x: 4, y: 11 }, { x: 7, y: 11 }],
      [{ x: 7, y: 11 }, { x: 10, y: 10 }],
      [{ x: 7, y: 11 }, { x: 10, y: 11 }],
      [{ x: 10, y: 10 }, { x: 10, y: 11 }],
      // 중앙 바위섬 교각 트러스
      [{ x: 10, y: 11 }, { x: 11, y: 11 }],
      [{ x: 11, y: 11 }, { x: 12, y: 11 }],
      [{ x: 12, y: 10 }, { x: 12, y: 11 }],
      [{ x: 10, y: 10 }, { x: 11, y: 11 }],
      [{ x: 11, y: 11 }, { x: 12, y: 10 }],
      [{ x: 10, y: 11 }, { x: 12, y: 10 }],
      [{ x: 10, y: 10 }, { x: 12, y: 11 }],
      // 우측 하부 트러스 및 현(갈림길 수평 하부현 포함)
      [{ x: 12, y: 10 }, { x: 16, y: 10 }],
      [{ x: 12, y: 11 }, { x: 16, y: 10 }],
      [{ x: 12, y: 11 }, { x: 15, y: 9 }],
      [{ x: 15, y: 9 }, { x: 16, y: 10 }],
      [{ x: 15, y: 9 }, { x: 18, y: 9 }],
      [{ x: 16, y: 10 }, { x: 18, y: 9 }],
      [{ x: 16, y: 10 }, { x: 18, y: 8 }],
      [{ x: 18, y: 9 }, { x: 18, y: 8 }],
      [{ x: 18, y: 8 }, { x: 18, y: 7 }],
    ]);

    const engine = new MatterBridgeEngine();
    engine.initialize(design, level);

    // 트럭이 중앙 교각 (x=10..12) 위로 지날 때 y=10 상판 위(y < 9.5)에 유지되는지 검증
    let minTruckYAtPier = Infinity;
    let maxTruckYAtPier = -Infinity;
    for (let i = 0; i < 1200 && engine.getStatus() !== 'failure' && engine.getStatus() !== 'success'; i++) {
      engine.step(1 / 60);
      const pos = engine.getCurrentFrame().truckPosition;
      if (pos.x >= 9.5 && pos.x <= 12.5) {
        minTruckYAtPier = Math.min(minTruckYAtPier, pos.y);
        maxTruckYAtPier = Math.max(maxTruckYAtPier, pos.y);
      }
    }
    const status = engine.getStatus();
    const report = engine.getFailureReport();
    const finalPos = engine.getCurrentFrame().truckPosition;
    engine.dispose();

    // 교각 구간(y=10 상판)에서 트럭 중심이 y=9.4 이상으로 빠지지 않아야 함 (정상 주행 시 약 9.25)
    expect(maxTruckYAtPier).toBeLessThan(9.6);
    expect(report, `status=${status}, finalX=${finalPos.x.toFixed(2)}, finalY=${finalPos.y.toFixed(2)}`).toBeNull();
    expect(status).toBe('success');
  });

  it('미완성 다리라도 왼쪽 도로에서 이어진 상판 위에서는 트럭이 바닥을 뚫고 빠지지 않는다', () => {
    const level = LEVELS.find((l) => l.id === 'level-017')!;
    const design = buildDesign(level, [
      [{ x: 4, y: 10 }, { x: 10, y: 10 }],
      [{ x: 10, y: 10 }, { x: 12, y: 10 }],
      [{ x: 4, y: 10 }, { x: 7, y: 11 }],
      [{ x: 7, y: 11 }, { x: 10, y: 10 }],
      [{ x: 10, y: 10 }, { x: 11, y: 11 }],
      [{ x: 11, y: 11 }, { x: 12, y: 10 }],
    ]);

    const engine = new MatterBridgeEngine();
    engine.initialize(design, level);
    let maxTruckYOnMidDeck = -Infinity;
    for (let i = 0; i < 600 && engine.getStatus() !== 'failure' && engine.getStatus() !== 'success'; i++) {
      engine.step(1 / 60);
      const pos = engine.getCurrentFrame().truckPosition;
      if (pos.x >= 9.5 && pos.x <= 11.8) {
        maxTruckYOnMidDeck = Math.max(maxTruckYOnMidDeck, pos.y);
      }
    }
    const status = engine.getStatus();
    engine.dispose();

    expect(maxTruckYOnMidDeck).toBeLessThan(9.6);
    expect(status).toBe('failure');
  });

  it('완만한 상판 위로 -2/3 기울기의 삼각 장애물을 세우면 유령 통과 없이 road_blocked로 차단된다', () => {
    const level = LEVELS.find((l) => l.id === 'level-001')!;
    const design = buildDesign(level, [
      [{ x: 5, y: 9 }, { x: 11, y: 9 }],
      [{ x: 11, y: 9 }, { x: 14, y: 9 }],
      [{ x: 5, y: 9 }, { x: 8, y: 11 }],
      [{ x: 8, y: 11 }, { x: 11, y: 9 }],
      [{ x: 11, y: 9 }, { x: 12, y: 11 }],
      [{ x: 12, y: 11 }, { x: 14, y: 9 }],
      // 도로 위 -2/3 경사 삼각형 장애물
      [{ x: 5, y: 9 }, { x: 8, y: 7 }],
      [{ x: 8, y: 7 }, { x: 11, y: 9 }],
    ]);

    const engine = new MatterBridgeEngine();
    engine.initialize(design, level);
    for (let i = 0; i < 600 && engine.getStatus() !== 'failure' && engine.getStatus() !== 'success'; i++) {
      engine.step(1 / 60);
    }
    const status = engine.getStatus();
    const report = engine.getFailureReport();
    engine.dispose();

    expect(status).toBe('failure');
    expect(report?.category).toBe('road_blocked');
  });
});
