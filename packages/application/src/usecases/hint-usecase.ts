import type { LevelHint } from '@cozybridge/domain';
import { getHintsByLevelId } from '@cozybridge/content';
import type { ICurrencyRepository } from '@cozybridge/infrastructure';

/**
 * 힌트 열람 및 재화 차감 유스케이스 (PRD 6.16)
 */
export class HintUseCase {
  private unlockedHints: Set<string> = new Set();

  constructor(private currencyRepo: ICurrencyRepository) {}

  async getHints(levelId: string): Promise<Array<LevelHint & { isUnlocked: boolean }>> {
    const hints = getHintsByLevelId(levelId);
    return hints.map((h) => ({
      ...h,
      isUnlocked: this.unlockedHints.has(h.id),
    }));
  }

  async getBalance(): Promise<number> {
    return this.currencyRepo.getBalance();
  }

  async unlockHint(hint: LevelHint): Promise<{ hint: LevelHint; remainingBalance: number }> {
    if (this.unlockedHints.has(hint.id)) {
      const balance = await this.currencyRepo.getBalance();
      return { hint, remainingBalance: balance };
    }

    const remainingBalance = await this.currencyRepo.deductBalance(hint.cost);
    this.unlockedHints.add(hint.id);
    return { hint, remainingBalance };
  }
}
