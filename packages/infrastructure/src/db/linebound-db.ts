import Dexie, { type EntityTable } from 'dexie';
import type {
  BridgeDesign,
  EntityId,
  GameMode,
  PublicDesignItem,
  ReactionType,
  SyncOperation,
  Timestamp,
} from '@linebound/domain';

/**
 * 단계별 플레이 기록 엔티티 (PRD 6.6, 6.9)
 */
export interface LevelProgressRecord {
  readonly levelId: EntityId;
  readonly completed: boolean;
  readonly bestCost: number;
  readonly stars: number;
  readonly lastPlayedAt: Timestamp;
}

/**
 * 직렬화 가능한 BridgeDesign 저장용 레코드
 * (Map을 Key-Value 객체 또는 배열로 직렬화)
 */
export interface BridgeDesignRecord {
  readonly id: EntityId;
  readonly ownerId: EntityId;
  readonly title: string;
  readonly description: string;
  readonly mode: GameMode;
  readonly levelId: EntityId;
  readonly visibility: 'private' | 'public';
  readonly currentVersionId: EntityId;
  readonly nodes: Array<{
    id: EntityId;
    x: number;
    y: number;
    nodeType: 'free' | 'anchor' | 'fixed';
    anchorId?: EntityId;
  }>;
  readonly members: Array<{
    id: EntityId;
    startNodeId: EntityId;
    endNodeId: EntityId;
    materialType: 'standard';
    cost: number;
  }>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  readonly schemaVersion: number;
}

export interface BridgeVersionRecord {
  readonly id: EntityId;
  readonly designId: EntityId;
  readonly versionNumber: number;
  readonly snapshot: string; // JSON 직렬화된 설계 스냅샷
  readonly createdAt: Timestamp;
  readonly parentVersionId?: EntityId;
}

export interface PublicDesignRecord {
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
  readonly snapshot: BridgeDesignRecord;
}

/**
 * Linebound 로컬 IndexedDB 데이터베이스 (PRD 8.1, 9.1)
 */
export class LineboundDatabase extends Dexie {
  designs!: EntityTable<BridgeDesignRecord, 'id'>;
  versions!: EntityTable<BridgeVersionRecord, 'id'>;
  levelProgress!: EntityTable<LevelProgressRecord, 'levelId'>;
  syncQueue!: EntityTable<SyncOperation, 'id'>;
  publicDesigns!: EntityTable<PublicDesignRecord, 'id'>;

  constructor(dbName: string = 'linebound_local_db') {
    super(dbName);

    this.version(1).stores({
      designs: 'id, ownerId, levelId, mode, updatedAt',
      versions: 'id, designId, versionNumber, createdAt',
      levelProgress: 'levelId, completed, lastPlayedAt',
    });

    this.version(2).stores({
      syncQueue: 'id, entityType, entityId, status, createdAt',
    });

    this.version(3).stores({
      publicDesigns: 'id, originalDesignId, levelId, publishedAt',
    });
  }
}

/**
 * 사용자 ID를 충돌 없는 안전한 로컬 저장소 스코프 키로 변환합니다.
 * - 게스트 또는 비로그인 상태는 'guest' 스코프를 사용합니다.
 * - 로그인 계정은 정규화된 문자열과 FNV-1a 해시 접미사를 결합해 서로 다른 userId 간 충돌을 방지합니다.
 */
export function resolveUserStorageScope(userId?: string | null): string {
  const trimmed = userId?.trim();
  if (
    !trimmed ||
    trimmed === 'local-guest' ||
    trimmed === 'local-user' ||
    trimmed === 'guest'
  ) {
    return 'guest';
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0');
  const safeSlug = trimmed
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 36);

  return `acct_${safeSlug}_${hashHex}`;
}

export function getScopedDatabaseName(userId?: string | null): string {
  const scope = resolveUserStorageScope(userId);
  return scope === 'guest'
    ? 'linebound_local_db_guest'
    : `linebound_local_db_${scope}`;
}

const scopedDbCache = new Map<string, LineboundDatabase>();

/**
 * 계정(userId)별로 완전히 격리된 LineboundDatabase 인스턴스를 반환합니다.
 */
export function getScopedDatabase(userId?: string | null): LineboundDatabase {
  const dbName = getScopedDatabaseName(userId);
  let db = scopedDbCache.get(dbName);
  if (!db) {
    db = new LineboundDatabase(dbName);
    scopedDbCache.set(dbName, db);
  }
  return db;
}

/**
 * 도메인 모델 <-> DB 레코드 변환 헬퍼
 */
export function toDesignRecord(design: BridgeDesign): BridgeDesignRecord {
  return {
    ...design,
    nodes: Array.from(design.nodes.values()),
    members: Array.from(design.members.values()),
  };
}

export function fromDesignRecord(record: BridgeDesignRecord): BridgeDesign {
  return {
    ...record,
    nodes: new Map(record.nodes.map((n) => [n.id, n])),
    members: new Map(record.members.map((m) => [m.id, m])),
  };
}

export function toPublicDesignRecord(
  item: PublicDesignItem,
): PublicDesignRecord {
  return {
    ...item,
    reactionCounts: { ...item.reactionCounts },
    userReactions: [...item.userReactions],
    snapshot: toDesignRecord(item.snapshot),
  };
}

export function fromPublicDesignRecord(
  record: PublicDesignRecord,
): PublicDesignItem {
  return {
    ...record,
    reactionCounts: { ...record.reactionCounts },
    userReactions: [...record.userReactions],
    snapshot: fromDesignRecord(record.snapshot),
  };
}
