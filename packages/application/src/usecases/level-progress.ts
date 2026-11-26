import type { EntityId } from '@linebound/domain';
import { LEVELS, type LevelDefinition } from '@linebound/content';
import type {
  ILevelProgressRepository,
  LevelProgressRecord,
} from '@linebound/infrastructure';

export interface LevelItemView {
  level: LevelDefinition;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestCost: number | null;
  stars: number;
}

/**
 * 레벨 진행 상태 관리 유스케이스 (PRD 6.6, 6.9)
 */
export class LevelProgressUseCase {
  constructor(private progressRepo: ILevelProgressRepository) {}

  /**
   * 단계 클리어 기록 및 별점 계산
   */
  async completeLevel(
    levelId: EntityId,
    cost: number,
    budget: number,
  ): Promise<LevelProgressRecord> {
    // 별점 계산:
    // 3스타: 예산의 75% 이하
    // 2스타: 예산의 90% 이하
    // 1스타: 예산 이내 통과
    let stars = 1;
    if (budget !== Infinity && budget > 0) {
      const ratio = cost / budget;
      if (ratio <= 0.75) {
        stars = 3;
      } else if (ratio <= 0.9) {
        stars = 2;
      }
    }

    return this.progressRepo.saveProgress(levelId, cost, stars);
  }

  /**
   * 전체 스테이지 목록 및 해금/클리어 상태 조회
   */
  async getLevelListView(): Promise<LevelItemView[]> {
    const progressMap = await this.progressRepo.getAllProgress();
    const completedSet = new Set<EntityId>();

    for (const [id, progress] of progressMap.entries()) {
      if (progress.completed) {
        completedSet.add(id);
      }
    }

    return LEVELS.map((level, index) => {
      // 첫 번째 레벨 또는 이미 클리어한 레벨은 항상 해금, 이후 레벨은 해금 조건 충족 시 해금
      let isUnlocked = index === 0 || completedSet.has(level.id);
      if (!isUnlocked && level.unlockRequirements.length > 0) {
        isUnlocked = level.unlockRequirements.every((req) =>
          completedSet.has(req.levelId),
        );
      }

      const progress = progressMap.get(level.id);

      return {
        level,
        isUnlocked,
        isCompleted: progress?.completed ?? false,
        bestCost: progress?.bestCost ?? null,
        stars: progress?.stars ?? 0,
      };
    });
  }
}
