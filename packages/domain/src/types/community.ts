import type { EntityId, Timestamp } from './common.js';
import type { BridgeDesign } from './bridge.js';

export type ReactionType = 'like' | 'creative' | 'clever';

/**
 * 커뮤니티 공개 작품 (PRD 6.14, 6.15)
 */
export interface PublicDesignItem {
  readonly id: EntityId;
  readonly originalDesignId: EntityId;
  readonly authorName: string;
  readonly title: string;
  readonly description: string;
  readonly levelId: EntityId;
  readonly memberCount: number;
  readonly buildCost: number;
  readonly reactionCounts: Record<ReactionType, number>;
  readonly userReactions: ReactionType[];
  readonly publishedAt: Timestamp;
  readonly snapshot: BridgeDesign;
}

/**
 * 다리 도면 일괄 공개(모두 광장으로 올리기) 결과
 */
export interface BulkPublishResult {
  readonly published: PublicDesignItem[];
  readonly skippedAlreadyPublished: number;
  readonly skippedEmpty: number;
}
