import type { EntityId, Timestamp } from './common.js';

export type SyncEntityType = 'design' | 'progress';
export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncOperationStatus = 'pending' | 'in_progress' | 'failed' | 'conflict';

/**
 * 오프라인 동기화 큐 작업 (PRD 6.13, 8.8)
 */
export interface SyncOperation {
  readonly id: EntityId;
  readonly entityType: SyncEntityType;
  readonly entityId: EntityId;
  readonly operationType: SyncOperationType;
  readonly payload: string; // JSON 직렬화된 데이터
  readonly attemptCount: number;
  readonly lastError?: string;
  readonly status: SyncOperationStatus;
  readonly createdAt: Timestamp;
}
