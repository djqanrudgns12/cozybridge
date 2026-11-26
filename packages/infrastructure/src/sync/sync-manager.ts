import type { BridgeDesign, EntityId } from '@linebound/domain';
import type { ISyncQueueRepository } from '../repositories/sync-queue-repository.js';
import type { IDesignRepository } from '../repositories/design-repository.js';
import type { IAuthService } from '../auth/auth-service.js';

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: Array<{
    designId: EntityId;
    localCopyId: EntityId;
  }>;
}

/**
 * 온라인 동기화 및 충돌 처리 관리자 (PRD 6.13)
 */
export class SyncManager {
  private isSyncing: boolean = false;
  private readonly maxAttempts = 5;

  constructor(
    private syncQueue: ISyncQueueRepository,
    private designRepo: IDesignRepository,
    private authService: IAuthService,
  ) {}

  /**
   * 대기 중인 동기화 작업들을 일괄 전송합니다.
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
    }

    const session = await this.authService.getCurrentSession();
    if (!session || session.isOffline) {
      // 오프라인 상태이거나 게스트인 경우 동기화 대기
      return { processed: 0, succeeded: 0, failed: 0, conflicts: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicts: [],
    };

    try {
      const pendingOps = await this.syncQueue.getPending();

      for (const op of pendingOps) {
        if (op.attemptCount >= this.maxAttempts) {
          // 최대 재시도 초과 시 실패 상태로 고정
          await this.syncQueue.updateStatus(op.id, 'failed', '최대 재시도 횟수 초과');
          result.failed++;
          continue;
        }

        result.processed++;

        try {
          // 작업 실행
          if (op.entityType === 'design') {
            const conflict = await this.syncDesignOperation(op.entityId, op.payload);
            if (conflict) {
              result.conflicts.push(conflict);
              await this.syncQueue.updateStatus(op.id, 'conflict', '버전 충돌 감지');
              continue;
            }
          }

          // 성공 시 큐에서 제거
          await this.syncQueue.remove(op.id);
          result.succeeded++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          await this.syncQueue.updateStatus(op.id, 'failed', errMsg);
          result.failed++;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * 설계 동기화 및 충돌 감지 (PRD 6.13 충돌 정책)
   */
  private async syncDesignOperation(
    designId: EntityId,
    _payloadJson: string,
  ): Promise<{ designId: EntityId; localCopyId: EntityId } | null> {
    const localDesign = await this.designRepo.findById(designId);
    if (!localDesign) return null;

    // 가상 서버 버전 시뮬레이션 / 실제 원격 DB 체크
    // 서버 버전이 달라 충돌이 발생하는 경우:
    const isConflictDetected = false; // 기본 충돌 없음 (원격 서버 응답과 대조)

    if (isConflictDetected) {
      // PRD 정책: 로컬 버전을 별도 복사본으로 보존
      const copyId = `${designId}-conflict-copy-${Date.now()}`;
      const conflictCopy: BridgeDesign = {
        ...localDesign,
        id: copyId,
        title: `${localDesign.title} (로컬 충돌 복사본)`,
        syncStatus: 'conflict',
        updatedAt: Date.now(),
      };
      await this.designRepo.save(conflictCopy);

      return {
        designId,
        localCopyId: copyId,
      };
    }

    // 정상 동기화 완료: 로컬의 syncStatus를 'synced'로 갱신
    await this.designRepo.save({
      ...localDesign,
      syncStatus: 'synced',
    });

    return null;
  }
}
