// ──────────────────────────────────────────────
// 설계 관리자 단위 테스트
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  createDesign,
  addNode,
  removeNode,
  addMember,
  removeMember,
  getOrCreateNode,
} from '../design/design-manager.js';
import type { LevelDefinition } from '../types/level.js';

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

describe('createDesign', () => {
  it('새 설계를 생성한다', () => {
    const design = createDesign({
      ownerId: 'user-1',
      title: '내 다리',
      mode: 'stage',
      levelId: 'level-1',
    });

    expect(design.id).toBeDefined();
    expect(design.ownerId).toBe('user-1');
    expect(design.title).toBe('내 다리');
    expect(design.mode).toBe('stage');
    expect(design.levelId).toBe('level-1');
    expect(design.nodes.size).toBe(0);
    expect(design.members.size).toBe(0);
    expect(design.schemaVersion).toBe(1);
    expect(design.syncStatus).toBe('pending');
    expect(design.visibility).toBe('private');
  });

  it('기본 description이 빈 문자열이다', () => {
    const design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'sandbox',
      levelId: 'level-1',
    });
    expect(design.description).toBe('');
  });
});

describe('addNode', () => {
  it('노드를 추가하고 새 design을 반환한다', () => {
    const design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'stage',
      levelId: 'level-1',
    });

    const result = addNode(design, { x: 3, y: 4 }, 'free');
    expect(result.nodeId).toBeDefined();
    expect(result.design.nodes.size).toBe(1);
    // 원본 불변 확인
    expect(design.nodes.size).toBe(0);

    const node = result.design.nodes.get(result.nodeId);
    expect(node).toBeDefined();
    expect(node!.x).toBe(3);
    expect(node!.y).toBe(4);
    expect(node!.nodeType).toBe('free');
  });
});

describe('removeNode', () => {
  it('노드와 연결된 부재를 함께 제거한다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'sandbox',
      levelId: 'level-1',
    });
    const level = createTestLevel();

    // 노드 3개 추가
    const r1 = addNode(design, { x: 0, y: 0 }, 'anchor');
    design = r1.design;
    const r2 = addNode(design, { x: 3, y: 0 }, 'free');
    design = r2.design;
    const r3 = addNode(design, { x: 3, y: 4 }, 'free');
    design = r3.design;

    // 부재 2개 추가
    const m1 = addMember(design, r1.nodeId, r2.nodeId, level);
    if (!m1.success) throw new Error('부재 추가 실패');
    design = m1.design;

    const m2 = addMember(design, r2.nodeId, r3.nodeId, level);
    if (!m2.success) throw new Error('부재 추가 실패');
    design = m2.design;

    expect(design.members.size).toBe(2);

    // 가운데 노드(n2) 제거 → 부재 2개 모두 제거
    const result = removeNode(design, r2.nodeId);
    expect(result.design.nodes.size).toBe(2);
    expect(result.design.members.size).toBe(0);
    expect(result.removedMemberIds).toHaveLength(2);
  });
});

describe('addMember', () => {
  it('부재를 추가하고 비용을 자동 계산한다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'stage',
      levelId: 'level-1',
    });
    const level = createTestLevel();

    const r1 = addNode(design, { x: 0, y: 0 }, 'anchor');
    design = r1.design;
    const r2 = addNode(design, { x: 3, y: 4 }, 'free');
    design = r2.design;

    const result = addMember(design, r1.nodeId, r2.nodeId, level);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.memberId).toBeDefined();
    const member = result.design.members.get(result.memberId);
    expect(member).toBeDefined();
    // 거리 5 × unitCost 10 = 50
    expect(member!.cost).toBe(50);
  });

  it('stage 모드에서 예산 초과 시 부재 추가를 거부한다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'stage',
      levelId: 'level-1',
    });
    const level = createTestLevel({ budget: 10, unitCost: 10 });

    const r1 = addNode(design, { x: 0, y: 0 }, 'anchor');
    design = r1.design;
    const r2 = addNode(design, { x: 5, y: 0 }, 'free');
    design = r2.design;

    // 거리 5 × unitCost 10 = 50 > budget 10
    const result = addMember(design, r1.nodeId, r2.nodeId, level);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.validation.errors.some(e => e.code === 'BUDGET_EXCEEDED')).toBe(true);
  });

  it('sandbox 모드에서는 예산 무제한이다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'sandbox',
      levelId: 'level-1',
    });
    const level = createTestLevel({ budget: 10, unitCost: 10 });

    const r1 = addNode(design, { x: 0, y: 0 }, 'anchor');
    design = r1.design;
    const r2 = addNode(design, { x: 5, y: 0 }, 'free');
    design = r2.design;

    // 거리 5 × unitCost 10 = 50 > budget 10이지만 sandbox이므로 허용
    const result = addMember(design, r1.nodeId, r2.nodeId, level);
    expect(result.success).toBe(true);
  });
});

describe('removeMember', () => {
  it('부재를 제거한다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'sandbox',
      levelId: 'level-1',
    });
    const level = createTestLevel();

    const r1 = addNode(design, { x: 0, y: 0 }, 'anchor');
    design = r1.design;
    const r2 = addNode(design, { x: 3, y: 0 }, 'free');
    design = r2.design;

    const m = addMember(design, r1.nodeId, r2.nodeId, level);
    if (!m.success) throw new Error('부재 추가 실패');
    design = m.design;

    expect(design.members.size).toBe(1);
    const updated = removeMember(design, m.memberId);
    expect(updated.members.size).toBe(0);
    // 원본 불변 확인
    expect(design.members.size).toBe(1);
  });
});

describe('getOrCreateNode', () => {
  it('같은 좌표의 노드가 없으면 새로 생성한다', () => {
    const design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'stage',
      levelId: 'level-1',
    });

    const result = getOrCreateNode(design, { x: 5, y: 5 });
    expect(result.nodeId).toBeDefined();
    expect(result.design.nodes.size).toBe(1);
  });

  it('같은 좌표의 노드가 있으면 재사용한다', () => {
    let design = createDesign({
      ownerId: 'user-1',
      title: '테스트',
      mode: 'stage',
      levelId: 'level-1',
    });

    const r1 = addNode(design, { x: 5, y: 5 }, 'free');
    design = r1.design;

    const r2 = getOrCreateNode(design, { x: 5, y: 5 });
    expect(r2.nodeId).toBe(r1.nodeId);
    expect(r2.design.nodes.size).toBe(1); // 새 노드 생성 안 함
    expect(r2.design).toBe(design); // 동일 참조 (변경 없음)
  });
});
