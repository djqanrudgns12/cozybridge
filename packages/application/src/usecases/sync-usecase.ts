import type { EntityId, SyncOperationType } from '@linebound/domain';
import type {
  ISyncQueueRepository,
  SyncManager,
  SyncResult,
} from '@linebound/infrastructure';

/**
 * 온라인 동기화 유스케이스 (PRD 6.13)
 */
export class SyncUseCase {
  constructor(
    private syncQueue: ISyncQueueRepository,
    private syncManager: SyncManager,
  ) {}

  /**
   * 로컬 설계 변경 사항을 동기화 큐에 예약
   */
  async queueDesignChange(
    designId: EntityId,
    type: SyncOperationType,
    payload: string,
  ): Promise<void> {
    await this.syncQueue.enqueue('design', designId, type, payload);
  }

  /**
   * 대기 중인 동기화 큐 작업 일괄 전송
   */
  async syncNow(): Promise<SyncResult> {
    return this.syncManager.processQueue();
  }

  /**
   * 대기 중인 동기화 작업 수 조회
   */
  async getPendingCount(): Promise<number> {
    return this.syncQueue.count();
  }
}
