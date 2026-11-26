import type {
  EntityId,
  FailureReport,
  GridPoint,
} from '@cozybridge/domain';

export interface DisplacementThresholds {
  /** 노드 최대 허용 변위 (격자 셀 단위) */
  maxNodeDisplacement: number;
  /** 부재 최대 허용 신장률 (1.0 = 원래 길이 대비 100%, 0.18 = 18% 신장 시 파단) */
  maxMemberStrain: number;
  /** 트럭 낙하 하한 Y (격자 좌표 기준) */
  truckFallThresholdY: number;
}

export const DEFAULT_THRESHOLDS: DisplacementThresholds = {
  maxNodeDisplacement: 0.85,
  maxMemberStrain: 0.18,
  truckFallThresholdY: 20.0,
};

/**
 * 붕괴 및 실패 판정 검사기 (PRD 5.5, 5.6)
 */
export class FailureDetector {
  private thresholds: DisplacementThresholds;

  constructor(thresholds: Partial<DisplacementThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  getThresholds(): Readonly<DisplacementThresholds> {
    return this.thresholds;
  }

  /**
   * 노드 변위 검사
   */
  checkNodeDisplacements(
    initialPositions: ReadonlyMap<EntityId, GridPoint>,
    currentPositions: ReadonlyMap<EntityId, GridPoint>,
    currentTime: number,
    overrideMaxDisplacement?: number,
  ): FailureReport | null {
    const limit = overrideMaxDisplacement ?? this.thresholds.maxNodeDisplacement;
    const failedNodes: EntityId[] = [];
    let maxDisplacement = 0;

    for (const [nodeId, initial] of initialPositions.entries()) {
      const current = currentPositions.get(nodeId);
      if (!current) continue;

      const dx = current.x - initial.x;
      const dy = current.y - initial.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDisplacement) {
        maxDisplacement = dist;
      }

      if (dist > limit) {
        failedNodes.push(nodeId);
      }
    }

    if (failedNodes.length > 0) {
      return {
        category: 'excessive_displacement',
        eventTime: currentTime,
        nodeIds: failedNodes,
        memberIds: [],
        severity: Math.min(1.0, maxDisplacement / (limit * 2)),
        confidence: 0.95,
        playerFacingMessageKey: 'failure.excessive_displacement',
      };
    }

    return null;
  }

  /**
   * 부재 변형률(Strain) 검사
   */
  checkMemberStrains(
    memberInitialLengths: ReadonlyMap<EntityId, number>,
    memberCurrentLengths: ReadonlyMap<EntityId, number>,
    memberNodeMap: ReadonlyMap<EntityId, [EntityId, EntityId]>,
    currentTime: number,
  ): FailureReport | null {
    const failedMembers: EntityId[] = [];
    const relatedNodes = new Set<EntityId>();
    let maxStrain = 0;

    for (const [memberId, initialLength] of memberInitialLengths.entries()) {
      if (initialLength <= 0.001) continue;

      const currentLength = memberCurrentLengths.get(memberId);
      if (currentLength === undefined) continue;

      const strain = Math.abs(currentLength - initialLength) / initialLength;
      if (strain > maxStrain) {
        maxStrain = strain;
      }

      if (strain > this.thresholds.maxMemberStrain) {
        failedMembers.push(memberId);
        const nodes = memberNodeMap.get(memberId);
        if (nodes) {
          relatedNodes.add(nodes[0]);
          relatedNodes.add(nodes[1]);
        }
      }
    }

    if (failedMembers.length > 0) {
      return {
        category: 'member_deformation',
        eventTime: currentTime,
        nodeIds: Array.from(relatedNodes),
        memberIds: failedMembers,
        severity: Math.min(1.0, maxStrain / (this.thresholds.maxMemberStrain * 1.5)),
        confidence: 0.9,
        playerFacingMessageKey: 'failure.member_deformation',
      };
    }

    return null;
  }

  /**
   * 트럭 추락 검사
   */
  checkTruckFall(
    truckY: number,
    currentTime: number,
    overrideThresholdY?: number,
  ): FailureReport | null {
    const threshold = overrideThresholdY ?? this.thresholds.truckFallThresholdY;
    if (truckY > threshold) {
      return {
        category: 'vehicle_fall',
        eventTime: currentTime,
        nodeIds: [],
        memberIds: [],
        severity: 1.0,
        confidence: 1.0,
        playerFacingMessageKey: 'failure.vehicle_fall',
      };
    }
    return null;
  }
}
