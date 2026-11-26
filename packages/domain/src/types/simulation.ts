// ──────────────────────────────────────────────
// 시뮬레이션(Simulation) 관련 타입 정의
// ──────────────────────────────────────────────

import type { EntityId, GridPoint, Timestamp } from './common.js';

/** 시뮬레이션 상태 */
export type SimulationStatus =
  | 'idle'
  | 'validating'
  | 'ready'
  | 'running'
  | 'success'
  | 'failure'
  | 'replaying'
  | 'paused'
  | 'error';

/** 실패 분류 */
export type FailureCategory =
  | 'excessive_displacement'
  | 'member_deformation'
  | 'support_failure'
  | 'vehicle_fall'
  | 'road_blocked'
  | 'simulation_instability'
  | 'unknown';

/** 실패 리포트 */
export interface FailureReport {
  readonly category: FailureCategory;
  /** 실패가 발생한 시뮬레이션 시간 */
  readonly eventTime: number;
  /** 관련 노드 ID 목록 */
  readonly nodeIds: readonly EntityId[];
  /** 관련 부재 ID 목록 */
  readonly memberIds: readonly EntityId[];
  /** 심각도 (0–1) */
  readonly severity: number;
  /** 판정 신뢰도 (0–1) */
  readonly confidence: number;
  /** 플레이어 표시용 메시지 키 (i18n) */
  readonly playerFacingMessageKey: string;
}

/** 시뮬레이션 결과 */
export interface SimulationResult {
  readonly id: EntityId;
  readonly designId: EntityId;
  readonly versionId: EntityId;
  readonly levelId: EntityId;
  readonly status: SimulationStatus;
  readonly buildCost: number;
  readonly remainingBudget: number;
  readonly failureCategory?: FailureCategory;
  readonly failureNodeIds?: readonly EntityId[];
  readonly failureMemberIds?: readonly EntityId[];
  /** 시뮬레이션 소요 시간(초) */
  readonly duration: number;
  readonly engineVersion: string;
  readonly createdAt: Timestamp;
}

/** 시뮬레이션 프레임 — 리플레이에 사용 */
export interface SimulationFrame {
  /** 시뮬레이션 시간(초) */
  readonly time: number;
  /** 노드별 월드 좌표 */
  readonly nodePositions: ReadonlyMap<EntityId, GridPoint>;
  /** 부재별 응력 값 */
  readonly memberStresses: ReadonlyMap<EntityId, number>;
  /** 현재 트럭 위치 */
  readonly truckPosition: GridPoint;
  /** 현재 트럭 회전 각도 (라디안) */
  readonly truckAngle?: number;
  /** 파단된 부재 ID 집합 */
  readonly brokenMemberIds?: ReadonlySet<EntityId>;
}
