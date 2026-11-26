// ──────────────────────────────────────────────
// 다리(Bridge) 관련 타입 정의
// ──────────────────────────────────────────────

import type {
  EntityId,
  GameMode,
  SchemaVersion,
  SyncStatus,
  Timestamp,
  Visibility,
} from './common.js';

/** 노드 종류: free = 자유 배치, anchor = 앵커 위치, fixed = 고정점 */
export type NodeType = 'free' | 'anchor' | 'fixed';

/** 격자 위의 노드 (절점) */
export interface BridgeNode {
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  readonly nodeType: NodeType;
  /** anchor 노드인 경우 연결된 앵커 ID */
  readonly anchorId?: EntityId;
}

/** 재료 타입 — MVP에서는 standard 하나만 지원 */
export type MaterialType = 'standard';

/** 두 노드를 잇는 부재 (멤버) */
export interface BridgeMember {
  readonly id: EntityId;
  readonly startNodeId: EntityId;
  readonly endNodeId: EntityId;
  readonly materialType: MaterialType;
  /** 부재 비용 = 길이 × unitCost */
  readonly cost: number;
}

/** 다리 설계 전체 */
export interface BridgeDesign {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly title: string;
  readonly description: string;
  readonly mode: GameMode;
  readonly levelId: EntityId;
  readonly visibility: Visibility;
  readonly currentVersionId: EntityId;
  readonly nodes: ReadonlyMap<EntityId, BridgeNode>;
  readonly members: ReadonlyMap<EntityId, BridgeMember>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly syncStatus: SyncStatus;
  readonly schemaVersion: SchemaVersion;
}

/** 설계 버전 스냅샷 */
export interface BridgeVersion {
  readonly id: EntityId;
  readonly designId: EntityId;
  readonly versionNumber: number;
  readonly snapshot: BridgeDesign;
  readonly createdAt: Timestamp;
  readonly parentVersionId?: EntityId;
  /** 포크 원본 설계 ID */
  readonly sourceDesignId?: EntityId;
  /** 포크 원본 버전 ID */
  readonly sourceVersionId?: EntityId;
}
