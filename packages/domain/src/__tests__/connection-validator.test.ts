// ──────────────────────────────────────────────
// 연결 검증기 단위 테스트
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { validateConnection } from '../validation/connection-validator.js';
import type { BridgeDesign, BridgeNode, BridgeMember } from '../types/bridge.js';
import type { LevelDefinition } from '../types/level.js';
import type { EntityId } from '../types/common.js';

/** 테스트용 기본 레벨 */
function createTestLevel(overrides?: Partial<LevelDefinition>): LevelDefinition {
  return {
    id: 'level-1',
    title: '테스트 레벨',
    description: '',
    difficulty: 1,
    budget: 1000,
    unitCost: 10,
    gridConfig: { width: 10, height: 10, cellSize: 50 },
    terrain: [],
    anchors: [],
    truckPath: [],
    unlockRequirements: [],
    contentVersion: 1,
    ...overrides,
  };
}

/** 테스트용 기본 설계 */
function createTestDesign(
  nodes: Map<EntityId, BridgeNode>,
  members: Map<EntityId, BridgeMember> = new Map(),
  mode: 'stage' | 'sandbox' = 'stage',
): BridgeDesign {
  return {
    id: 'design-1',
    ownerId: 'user-1',
    title: '테스트 설계',
    description: '',
    mode,
    levelId: 'level-1',
    visibility: 'private',
    currentVersionId: 'v1',
    nodes,
    members,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncStatus: 'pending',
    schemaVersion: 1,
  };
}

describe('validateConnection', () => {
  it('유효한 연결을 허용한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 3, y: 0, nodeType: 'free' }],
    ]);
    const design = createTestDesign(nodes);
    const level = createTestLevel();

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('같은 위치의 노드 연결을 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 3, y: 3, nodeType: 'free' }],
      ['n2', { id: 'n2', x: 3, y: 3, nodeType: 'free' }],
    ]);
    const design = createTestDesign(nodes);
    const level = createTestLevel();

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'SAME_POSITION')).toBe(true);
  });

  it('격자 범위 밖 노드 연결을 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 15, y: 0, nodeType: 'free' }], // 범위 밖
    ]);
    const design = createTestDesign(nodes);
    const level = createTestLevel();

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'END_OUT_OF_GRID')).toBe(true);
  });

  it('중복 부재를 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 3, y: 0, nodeType: 'free' }],
    ]);
    const members = new Map<EntityId, BridgeMember>([
      ['m1', { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', materialType: 'standard', cost: 30 }],
    ]);
    const design = createTestDesign(nodes, members);
    const level = createTestLevel();

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_MEMBER')).toBe(true);
  });

  it('역순 중복 부재도 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 3, y: 0, nodeType: 'free' }],
    ]);
    const members = new Map<EntityId, BridgeMember>([
      ['m1', { id: 'm1', startNodeId: 'n2', endNodeId: 'n1', materialType: 'standard', cost: 30 }],
    ]);
    const design = createTestDesign(nodes, members);
    const level = createTestLevel();

    // n1 → n2 순서로 시도하지만 이미 n2 → n1 부재가 있음
    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_MEMBER')).toBe(true);
  });

  it('존재하지 않는 노드 ID를 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
    ]);
    const design = createTestDesign(nodes);
    const level = createTestLevel();

    const result = validateConnection('n1', 'n-not-exist', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_END_NODE')).toBe(true);
  });

  it('stage 모드에서 예산 초과를 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 10, y: 0, nodeType: 'free' }],
    ]);
    const design = createTestDesign(nodes);
    // 예산 10, unitCost 10, 거리 10이면 비용 100 > 예산 10
    const level = createTestLevel({ budget: 10 });

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'BUDGET_EXCEEDED')).toBe(true);
  });

  it('sandbox 모드에서는 예산 초과를 허용한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 10, y: 0, nodeType: 'free' }],
    ]);
    const design = createTestDesign(nodes, new Map(), 'sandbox');
    const level = createTestLevel({ budget: 10 });

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(true);
  });

  it('maxMemberLength를 초과하는 긴 단일 부재 연결을 거부한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 9, y: 0, nodeType: 'anchor' }],
    ]);
    const design = createTestDesign(nodes);
    const level = createTestLevel({ maxMemberLength: 6 });

    const result = validateConnection('n1', 'n2', design, level);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MEMBER_TOO_LONG')).toBe(true);
  });
});
