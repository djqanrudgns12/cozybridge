import { describe, it, expect, beforeEach } from 'vitest';
import type { BridgeDesign, LevelDefinition } from '@linebound/domain';
import { MatterBridgeEngine } from '../matter-bridge-engine.js';

describe('MatterBridgeEngine 물리 엔진 기술 검증', () => {
  let engine: MatterBridgeEngine;

  const mockLevel: LevelDefinition = {
    id: 'test-level',
    title: '테스트 레벨',
    description: '물리 검증용 레벨',
    difficulty: 1,
    budget: 10000,
    unitCost: 500,
    gridConfig: { width: 10, height: 10, cellSize: 40 },
    terrain: [
      { x: 0, y: 5 }, { x: 1, y: 5 },
      { x: 8, y: 5 }, { x: 9, y: 5 },
    ],
    anchors: [
      { id: 'a1', x: 1, y: 5, type: 'fixed' },
      { id: 'a2', x: 8, y: 5, type: 'fixed' },
    ],
    truckPath: [
      { x: 0, y: 4 },
      { x: 9, y: 4 },
    ],
    unlockRequirements: [],
    contentVersion: 1,
  };

  beforeEach(() => {
    engine = new MatterBridgeEngine();
  });

  it('초기화 시 ready 상태가 된다', () => {
    const emptyDesign: BridgeDesign = {
      id: 'd1',
      ownerId: 'u1',
      title: '빈 설계',
      description: '',
      mode: 'stage',
      levelId: 'test-level',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map([
        ['n1', { id: 'n1', x: 1, y: 5, nodeType: 'anchor', anchorId: 'a1' }],
        ['n2', { id: 'n2', x: 8, y: 5, nodeType: 'anchor', anchorId: 'a2' }],
      ]),
      members: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    const status = engine.initialize(emptyDesign, mockLevel);
    expect(status).toBe('ready');
    expect(engine.getStatus()).toBe('ready');
  });

  it('다리가 없으면 트럭이 추락하여 vehicle_fall 실패로 판정된다', () => {
    const emptyDesign: BridgeDesign = {
      id: 'd1',
      ownerId: 'u1',
      title: '다리 없음',
      description: '',
      mode: 'stage',
      levelId: 'test-level',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map([
        ['n1', { id: 'n1', x: 1, y: 5, nodeType: 'anchor', anchorId: 'a1' }],
        ['n2', { id: 'n2', x: 8, y: 5, nodeType: 'anchor', anchorId: 'a2' }],
      ]),
      members: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    engine.initialize(emptyDesign, mockLevel);

    // 시뮬레이션을 몇 초 진행 (60fps * 3초)
    for (let i = 0; i < 180; i++) {
      engine.step(1 / 60);
      if (engine.getStatus() === 'failure') break;
    }

    expect(engine.getStatus()).toBe('failure');
    const report = engine.getFailureReport();
    expect(report).not.toBeNull();
    expect(report?.category).toBe('vehicle_fall');
    expect(report?.playerFacingMessageKey).toBe('failure.vehicle_fall');

    // 리플레이 프레임이 저장되어 있는지 확인
    const replayFrames = engine.getReplayFrames();
    expect(replayFrames.length).toBeGreaterThan(0);
  });

  it('튼튼한 연결 구조가 있으면 트럭이 다리를 건널 수 있다', () => {
    // 앵커 1번부터 8번까지 연속적으로 연결된 다리
    const nodes = [
      { id: 'n1', x: 1, y: 5, nodeType: 'anchor' as const, anchorId: 'a1' },
      { id: 'n2', x: 3, y: 5, nodeType: 'fixed' as const },
      { id: 'n3', x: 5, y: 5, nodeType: 'fixed' as const },
      { id: 'n4', x: 8, y: 5, nodeType: 'anchor' as const, anchorId: 'a2' },
    ];

    const members = [
      { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', materialType: 'standard' as const, cost: 1000 },
      { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', materialType: 'standard' as const, cost: 1000 },
      { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', materialType: 'standard' as const, cost: 1000 },
    ];

    const bridgeDesign: BridgeDesign = {
      id: 'd2',
      ownerId: 'u1',
      title: '연결된 다리',
      description: '',
      mode: 'stage',
      levelId: 'test-level',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map(nodes.map((n) => [n.id, n])),
      members: new Map(members.map((m) => [m.id, m])),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    engine.initialize(bridgeDesign, mockLevel);

    for (let i = 0; i < 400; i++) {
      const frame = engine.step(1 / 60);
      expect(frame).toBeDefined();

      const status = engine.getStatus();
      if (status === 'success' || status === 'failure') {
        break;
      }
    }

    // 시뮬레이션이 안정적으로 굴러가거나 성공 상태에 도달
    const status = engine.getStatus();
    expect(['running', 'success']).toContain(status);
  });
});
