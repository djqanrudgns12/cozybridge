import type { EntityId, Timestamp } from '@linebound/domain';
import { LineboundDatabase, type LevelProgressRecord } from '../db/linebound-db.js';

export interface ILevelProgressRepository {
  getProgress(levelId: EntityId): Promise<LevelProgressRecord | null>;
  getAllProgress(): Promise<Map<EntityId, LevelProgressRecord>>;
  saveProgress(
    levelId: EntityId,
    cost: number,
    stars: number,
  ): Promise<LevelProgressRecord>;
}

export class IndexedDbLevelProgressRepository implements ILevelProgressRepository {
  constructor(private db: LineboundDatabase) {}

  async getProgress(levelId: EntityId): Promise<LevelProgressRecord | null> {
    const record = await this.db.levelProgress.get(levelId);
    return record ?? null;
  }

  async getAllProgress(): Promise<Map<EntityId, LevelProgressRecord>> {
    const records = await this.db.levelProgress.toArray();
    const map = new Map<EntityId, LevelProgressRecord>();
    for (const r of records) {
      map.set(r.levelId, r);
    }
    return map;
  }

  async saveProgress(
    levelId: EntityId,
    cost: number,
    stars: number,
  ): Promise<LevelProgressRecord> {
    const existing = await this.db.levelProgress.get(levelId);
    const now: Timestamp = Date.now();

    const bestCost = existing ? Math.min(existing.bestCost, cost) : cost;
    const bestStars = existing ? Math.max(existing.stars, stars) : stars;

    const record: LevelProgressRecord = {
      levelId,
      completed: true,
      bestCost,
      stars: bestStars,
      lastPlayedAt: now,
    };

    await this.db.levelProgress.put(record);
    return record;
  }
}
