import type {
  EntityId,
  SyncEntityType,
  SyncOperation,
  SyncOperationStatus,
  SyncOperationType,
} from '@linebound/domain';
import { LineboundDatabase } from '../db/linebound-db.js';

export interface ISyncQueueRepository {
  enqueue(
    entityType: SyncEntityType,
    entityId: EntityId,
    operationType: SyncOperationType,
    payload: string,
  ): Promise<SyncOperation>;

  getPending(): Promise<SyncOperation[]>;
  updateStatus(
    id: EntityId,
    status: SyncOperationStatus,
    lastError?: string,
  ): Promise<void>;
  remove(id: EntityId): Promise<void>;
  count(): Promise<number>;
}

export class IndexedDbSyncQueueRepository implements ISyncQueueRepository {
  constructor(private db: LineboundDatabase) {}

  async enqueue(
    entityType: SyncEntityType,
    entityId: EntityId,
    operationType: SyncOperationType,
    payload: string,
  ): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      entityType,
      entityId,
      operationType,
      payload,
      attemptCount: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.db.syncQueue.put(operation);
    return operation;
  }

  async getPending(): Promise<SyncOperation[]> {
    return this.db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('createdAt');
  }

  async updateStatus(
    id: EntityId,
    status: SyncOperationStatus,
    lastError?: string,
  ): Promise<void> {
    const existing = await this.db.syncQueue.get(id);
    if (!existing) return;

    await this.db.syncQueue.update(id, {
      status,
      lastError,
      attemptCount: existing.attemptCount + 1,
    });
  }

  async remove(id: EntityId): Promise<void> {
    await this.db.syncQueue.delete(id);
  }

  async count(): Promise<number> {
    return this.db.syncQueue.count();
  }
}
