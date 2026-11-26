import type {
  BridgeDesign,
  BulkPublishResult,
  EntityId,
  PublicDesignItem,
  ReactionType,
} from '@cozybridge/domain';
import type { ICommunityRepository } from '@cozybridge/infrastructure';

/**
 * 공개 작품 탐색, 게시, 복제 및 반응 유스케이스 (PRD 6.14, 6.15)
 */
export class CommunityUseCase {
  constructor(private communityRepo: ICommunityRepository) {}

  async getPublicDesigns(levelId?: EntityId): Promise<PublicDesignItem[]> {
    return this.communityRepo.getPublicDesigns(levelId);
  }

  async publishDesign(
    design: BridgeDesign,
    authorName: string,
  ): Promise<PublicDesignItem> {
    return this.communityRepo.publishDesign(design, authorName);
  }

  async publishDesigns(
    designs: readonly BridgeDesign[],
    authorName: string,
  ): Promise<BulkPublishResult> {
    return this.communityRepo.publishDesigns(designs, authorName);
  }

  async cloneDesign(
    publicDesignId: EntityId,
    newOwnerId: EntityId,
  ): Promise<BridgeDesign> {
    return this.communityRepo.cloneDesign(publicDesignId, newOwnerId);
  }

  async toggleReaction(
    publicDesignId: EntityId,
    userId: EntityId,
    reaction: ReactionType,
  ): Promise<{ counts: Record<ReactionType, number>; active: boolean }> {
    return this.communityRepo.toggleReaction(publicDesignId, userId, reaction);
  }
}
