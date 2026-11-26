import { resolveUserStorageScope } from '../db/cozybridge-db.js';

export interface ICurrencyRepository {
  getBalance(): Promise<number>;
  addBalance(amount: number): Promise<number>;
  deductBalance(amount: number): Promise<number>;
}

/**
 * 게임 내 재화 로컬 저장소 (PRD 6.16)
 */
export class LocalCurrencyRepository implements ICurrencyRepository {
  private readonly storageKey: string;
  private currentBalance: number = 200; // 신규 유저 기본 제공 200 코인

  constructor(userId?: string | null) {
    const scope = userId ? resolveUserStorageScope(userId) : 'guest';
    this.storageKey =
      scope === 'guest'
        ? 'cozybridge_coin_balance'
        : `cozybridge_coin_balance:${scope}`;

    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.storageKey);
      if (saved !== null) {
        this.currentBalance = parseInt(saved, 10) || 200;
      }
    }
  }

  async getBalance(): Promise<number> {
    return this.currentBalance;
  }

  async addBalance(amount: number): Promise<number> {
    if (amount <= 0) return this.currentBalance;
    this.currentBalance += amount;
    this.persist();
    return this.currentBalance;
  }

  async deductBalance(amount: number): Promise<number> {
    if (this.currentBalance < amount) {
      throw new Error(`재화가 부족합니다. (필요: ${amount}, 보유: ${this.currentBalance})`);
    }
    this.currentBalance -= amount;
    this.persist();
    return this.currentBalance;
  }

  private persist() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.storageKey, this.currentBalance.toString());
    }
  }
}
