import type { EntityId } from './common.js';

export interface LevelHint {
  readonly id: EntityId;
  readonly levelId: EntityId;
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly cost: number;
}
