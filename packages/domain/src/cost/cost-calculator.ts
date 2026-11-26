// ──────────────────────────────────────────────
// 비용 계산기
// ──────────────────────────────────────────────

import type { BridgeMember, BridgeNode, EntityId, GridPoint } from '../types/index.js';
import { calculateDistance } from '../grid/grid-math.js';

/**
 * 단일 부재의 비용을 계산한다.
 * 공식: memberCost = length × unitCost
 */
export function calculateMemberCost(
  startNode: GridPoint,
  endNode: GridPoint,
  unitCost: number,
): number {
  const length = calculateDistance(startNode, endNode);
  return length * unitCost;
}

/**
 * 모든 부재의 총 비용을 계산한다.
 * 각 부재의 시작/끝 노드 좌표를 기반으로 재계산.
 */
export function calculateTotalCost(
  members: BridgeMember[],
  nodes: ReadonlyMap<EntityId, BridgeNode>,
  unitCost: number,
): number {
  let total = 0;
  for (const member of members) {
    const startNode = nodes.get(member.startNodeId);
    const endNode = nodes.get(member.endNodeId);
    if (startNode && endNode) {
      total += calculateMemberCost(startNode, endNode, unitCost);
    }
  }
  return total;
}

/**
 * 잔여 예산을 계산한다.
 */
export function calculateRemainingBudget(
  budget: number,
  totalCost: number,
): number {
  return budget - totalCost;
}

/**
 * 예산이 초과되었는지 판정한다.
 */
export function isBudgetExceeded(
  budget: number,
  totalCost: number,
): boolean {
  return totalCost > budget;
}
