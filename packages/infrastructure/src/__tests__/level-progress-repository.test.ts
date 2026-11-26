import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LineboundDatabase } from '../db/linebound-db.js';
import { IndexedDbLevelProgressRepository } from '../repositories/level-progress-repository.js';

describe('IndexedDbLevelProgressRepository 테스트', () => {
  let db: LineboundDatabase;
  let repo: IndexedDbLevelProgressRepository;

  beforeEach(() => {
    db = new LineboundDatabase(`test_level_db_${Date.now()}_${Math.random()}`);
    repo = new IndexedDbLevelProgressRepository(db);
  });

  it('레벨 클리어 기록을 저장하고 최저 비용을 갱신한다', async () => {
    // 1차 클리어: 비용 9000, 별 2개
    await repo.saveProgress('level-001', 9000, 2);
    let progress = await repo.getProgress('level-001');

    expect(progress).not.toBeNull();
    expect(progress?.completed).toBe(true);
    expect(progress?.bestCost).toBe(9000);
    expect(progress?.stars).toBe(2);

    // 2차 클리어: 더 적은 비용(7500)으로 클리어 시 최저 비용 갱신
    await repo.saveProgress('level-001', 7500, 3);
    progress = await repo.getProgress('level-001');

    expect(progress?.bestCost).toBe(7500);
    expect(progress?.stars).toBe(3);

    // 3차 클리어: 더 비싼 비용(8000)으로 클리어 시 기존 최저 비용(7500) 유지
    await repo.saveProgress('level-001', 8000, 3);
    progress = await repo.getProgress('level-001');

    expect(progress?.bestCost).toBe(7500);
  });
});
