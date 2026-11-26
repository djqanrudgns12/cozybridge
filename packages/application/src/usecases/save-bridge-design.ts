import type { BridgeDesign, EntityId } from '@cozybridge/domain';
import type { IDesignRepository } from '@cozybridge/infrastructure';

/**
 * 설계 저장 유스케이스 (PRD 6.11)
 */
export class SaveBridgeDesignUseCase {
  constructor(private designRepo: IDesignRepository) {}

  async execute(design: BridgeDesign): Promise<void> {
    const updated: BridgeDesign = {
      ...design,
      updatedAt: Date.now(),
    };
    await this.designRepo.save(updated);
  }
}

/**
 * 설계 불러오기 유스케이스
 */
export class LoadBridgeDesignUseCase {
  constructor(private designRepo: IDesignRepository) {}

  async execute(designId: EntityId): Promise<BridgeDesign | null> {
    return this.designRepo.findById(designId);
  }

  async getLatestByLevel(levelId: EntityId): Promise<BridgeDesign | null> {
    const designs = await this.designRepo.findByLevelId(levelId);
    if (designs.length === 0) return null;
    return designs.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  }

  async getAllDesigns(): Promise<BridgeDesign[]> {
    return this.designRepo.getAll();
  }
}
