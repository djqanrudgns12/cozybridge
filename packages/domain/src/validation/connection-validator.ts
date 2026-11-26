// ──────────────────────────────────────────────
// 연결 검증기 (GR-004)
// ──────────────────────────────────────────────

import type { BridgeDesign } from '../types/bridge.js';
import type { LevelDefinition } from '../types/level.js';
import type { EntityId } from '../types/common.js';
import { isValidGridPoint, calculateDistance } from '../grid/grid-math.js';

/** 기본 단일 부재 최대 허용 길이 (격자 칸 수) */
export const DEFAULT_MAX_MEMBER_LENGTH = 6;

/** 검증 에러 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
}

/** 검증 결과 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

/**
 * 두 노드 사이의 연결을 검증한다.
 *
 * 검증 항목 (GR-004):
 * 1. 시작 노드가 유효한 격자 위치
 * 2. 끝 노드가 유효한 격자 위치
 * 3. 두 노드는 서로 다른 위치
 * 4. 부재 길이가 0보다 큼
 * 5. 건설 영역(격자 범위) 안에 있음
 * 6. 중복 부재 없음
 * 7. 단계 규칙 위반 없음 (stage 모드에서 예산 검증)
 */
export function validateConnection(
  startNodeId: EntityId,
  endNodeId: EntityId,
  design: BridgeDesign,
  level: LevelDefinition,
): ValidationResult {
  const errors: ValidationError[] = [];
  const startNode = design.nodes.get(startNodeId);
  const endNode = design.nodes.get(endNodeId);

  // 노드 존재 여부 확인
  if (!startNode) {
    errors.push({
      code: 'INVALID_START_NODE',
      message: `시작 노드(${startNodeId})를 찾을 수 없습니다.`,
    });
  }
  if (!endNode) {
    errors.push({
      code: 'INVALID_END_NODE',
      message: `끝 노드(${endNodeId})를 찾을 수 없습니다.`,
    });
  }

  // 노드가 없으면 이후 검증 불가
  if (!startNode || !endNode) {
    return { valid: false, errors };
  }

  // 1. 시작점이 유효한 격자 위치
  if (!isValidGridPoint(startNode, level.gridConfig)) {
    errors.push({
      code: 'START_OUT_OF_GRID',
      message: `시작 노드(${startNode.x}, ${startNode.y})가 격자 범위 밖에 있습니다.`,
    });
  }

  // 2. 끝점이 유효한 격자 위치
  if (!isValidGridPoint(endNode, level.gridConfig)) {
    errors.push({
      code: 'END_OUT_OF_GRID',
      message: `끝 노드(${endNode.x}, ${endNode.y})가 격자 범위 밖에 있습니다.`,
    });
  }

  // 3. 두 점은 서로 다른 위치
  if (startNode.x === endNode.x && startNode.y === endNode.y) {
    errors.push({
      code: 'SAME_POSITION',
      message: '시작점과 끝점이 같은 위치입니다.',
    });
  }

  // 4. 길이가 0보다 큼 및 최대 부재 길이 제한
  const length = calculateDistance(startNode, endNode);
  if (length === 0) {
    errors.push({
      code: 'ZERO_LENGTH',
      message: '부재 길이가 0입니다.',
    });
  }
  if (
    level.maxMemberLength !== undefined &&
    length > level.maxMemberLength + 1e-6
  ) {
    errors.push({
      code: 'MEMBER_TOO_LONG',
      message: `부재 길이가 최대 허용 길이(${level.maxMemberLength}칸)를 초과합니다. (현재: ${length.toFixed(2)}칸)`,
    });
  }

  // 5. 건설 영역 안에 있음 (이미 1,2에서 격자 범위 검증)
  // — 격자 범위 = 건설 영역으로 간주

  // 6. 중복 부재 없음
  for (const member of design.members.values()) {
    const isDuplicate =
      (member.startNodeId === startNodeId && member.endNodeId === endNodeId) ||
      (member.startNodeId === endNodeId && member.endNodeId === startNodeId);
    if (isDuplicate) {
      errors.push({
        code: 'DUPLICATE_MEMBER',
        message: '동일한 두 노드 사이에 이미 부재가 존재합니다.',
      });
      break;
    }
  }

  // 7. 단계 규칙 — stage 모드에서 예산 초과 검증
  if (design.mode === 'stage') {
    const currentCost = computeCurrentTotalCost(design, level.unitCost);
    const newMemberCost = length * level.unitCost;
    if (currentCost + newMemberCost > level.budget) {
      errors.push({
        code: 'BUDGET_EXCEEDED',
        message: `예산을 초과합니다. (현재: ${currentCost.toFixed(2)}, 추가: ${newMemberCost.toFixed(2)}, 예산: ${level.budget})`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/** 현재 설계의 총 비용을 내부적으로 계산한다. */
function computeCurrentTotalCost(
  design: BridgeDesign,
  unitCost: number,
): number {
  let total = 0;
  for (const member of design.members.values()) {
    const s = design.nodes.get(member.startNodeId);
    const e = design.nodes.get(member.endNodeId);
    if (s && e) {
      total += calculateDistance(s, e) * unitCost;
    }
  }
  return total;
}
