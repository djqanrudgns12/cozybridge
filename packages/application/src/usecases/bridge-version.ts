import type {
  BridgeDesign,
  BridgeVersion,
  EntityId,
} from '@linebound/domain';
import type { IDesignRepository } from '@linebound/infrastructure';

/**
 * 설계 버전 생성 유스케이스 (PRD 6.12)
 */
export class CreateBridgeVersionUseCase {
  constructor(private designRepo: IDesignRepository) {}

  async execute(
    design: BridgeDesign,
    parentVersionId?: EntityId,
  ): Promise<BridgeVersion> {
    const existingVersions = await this.designRepo.getVersionsByDesignId(design.id);
    const nextVersionNumber = existingVersions.length + 1;
    const versionId = `v-${design.id}-${nextVersionNumber}-${Date.now()}`;

    const newVersion: BridgeVersion = {
      id: versionId,
      designId: design.id,
      versionNumber: nextVersionNumber,
      snapshot: { ...design },
      createdAt: Date.now(),
      parentVersionId: parentVersionId ?? design.currentVersionId,
    };

    await this.designRepo.saveVersion(newVersion);

    // 설계의 currentVersionId 갱신
    await this.designRepo.save({
      ...design,
      currentVersionId: versionId,
      updatedAt: Date.now(),
    });

    return newVersion;
  }
}

/**
 * 설계 버전 복원 유스케이스 (PRD 6.12)
 * 기존 기록을 덮어쓰지 않고 새 버전을 생성하여 복원합니다.
 */
export class RestoreBridgeVersionUseCase {
  constructor(
    private designRepo: IDesignRepository,
    private createVersionUseCase: CreateBridgeVersionUseCase,
  ) {}

  async execute(
    designId: EntityId,
    targetVersionId: EntityId,
  ): Promise<BridgeDesign> {
    const versions = await this.designRepo.getVersionsByDesignId(designId);
    const targetVersion = versions.find((v) => v.id === targetVersionId);

    if (!targetVersion) {
      throw new Error(`버전을 찾을 수 없습니다: ${targetVersionId}`);
    }

    // 복원할 스냅샷으로부터 새 설계 객체 생성
    const restoredDesign: BridgeDesign = {
      ...targetVersion.snapshot,
      updatedAt: Date.now(),
    };

    // 복원 사실을 새 버전으로 기록
    await this.createVersionUseCase.execute(restoredDesign, targetVersionId);

    return restoredDesign;
  }

  async getVersions(designId: EntityId): Promise<BridgeVersion[]> {
    return this.designRepo.getVersionsByDesignId(designId);
  }
}
