// ──────────────────────────────────────────────
// 비용 계산기 단위 테스트
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  calculateMemberCost,
  calculateTotalCost,
  calculateRemainingBudget,
  isBudgetExceeded,
} from '../cost/cost-calculator.js';
import type { BridgeMember, BridgeNode, EntityId } from '../types/index.js';

describe('calculateMemberCost', () => {
  it('수평 부재 비용을 계산한다', () => {
    const cost = calculateMemberCost({ x: 0, y: 0 }, { x: 3, y: 0 }, 10);
    expect(cost).toBe(30); // 거리 3 × unitCost 10
  });

  it('대각선 부재 비용을 계산한다 (3-4-5)', () => {
    const cost = calculateMemberCost({ x: 0, y: 0 }, { x: 3, y: 4 }, 10);
    expect(cost).toBe(50); // 거리 5 × unitCost 10
  });

  it('같은 점이면 비용 0', () => {
    const cost = calculateMemberCost({ x: 2, y: 2 }, { x: 2, y: 2 }, 10);
    expect(cost).toBe(0);
  });
});

describe('calculateTotalCost', () => {
  it('모든 부재의 비용 합계를 계산한다', () => {
    const nodes = new Map<EntityId, BridgeNode>([
      ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
      ['n2', { id: 'n2', x: 3, y: 0, nodeType: 'free' }],
      ['n3', { id: 'n3', x: 3, y: 4, nodeType: 'free' }],
    ]);

    const members: BridgeMember[] = [
      { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', materialType: 'standard', cost: 0 },
      { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', materialType: 'standard', cost: 0 },
    ];

    const total = calculateTotalCost(members, nodes, 10);
    // m1: 거리 3 × 10 = 30, m2: 거리 4 × 10 = 40 → 합계 70
    expect(total).toBe(70);
  });

  it('부재가 없으면 비용 0', () => {
    const total = calculateTotalCost([], new Map(), 10);
    expect(total).toBe(0);
  });
});

describe('calculateRemainingBudget', () => {
  it('잔여 예산을 계산한다', () => {
    expect(calculateRemainingBudget(100, 70)).toBe(30);
  });

  it('예산을 초과하면 음수를 반환한다', () => {
    expect(calculateRemainingBudget(50, 70)).toBe(-20);
  });
});

describe('isBudgetExceeded', () => {
  it('비용이 예산 이하이면 false', () => {
    expect(isBudgetExceeded(100, 70)).toBe(false);
  });

  it('비용이 예산과 같으면 false', () => {
    expect(isBudgetExceeded(100, 100)).toBe(false);
  });

  it('비용이 예산을 초과하면 true', () => {
    expect(isBudgetExceeded(100, 101)).toBe(true);
  });
});
