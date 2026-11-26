import type {
  BridgeDesign,
  BulkPublishResult,
  EntityId,
  PublicDesignItem,
  ReactionType,
} from '@linebound/domain';
import {
  LineboundDatabase,
  fromPublicDesignRecord,
  toDesignRecord,
  toPublicDesignRecord,
} from '../db/linebound-db.js';

export interface ICommunityRepository {
  getPublicDesigns(levelId?: EntityId): Promise<PublicDesignItem[]>;
  publishDesign(
    design: BridgeDesign,
    authorName: string,
  ): Promise<PublicDesignItem>;
  publishDesigns(
    designs: readonly BridgeDesign[],
    authorName: string,
  ): Promise<BulkPublishResult>;
  cloneDesign(
    publicDesignId: EntityId,
    newOwnerId: EntityId,
  ): Promise<BridgeDesign>;
  toggleReaction(
    publicDesignId: EntityId,
    userId: EntityId,
    reaction: ReactionType,
  ): Promise<{ counts: Record<ReactionType, number>; active: boolean }>;
}

/**
 * 인메모리 + 로컬 IndexedDB 커뮤니티 저장소 (PRD 6.14, 6.15)
 */
export class CommunityRepository implements ICommunityRepository {
  private publicItems: Map<EntityId, PublicDesignItem> = new Map();
  private userReactions: Map<string, Set<ReactionType>> = new Map();
  private hydrated = false;

  constructor(private db: LineboundDatabase) {
    // Phase 3 기본 시드 공개 작품
    this.seedDefaultDesigns();
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const savedRecords = await this.db.publicDesigns.toArray();
      for (const rec of savedRecords) {
        this.publicItems.set(rec.id, fromPublicDesignRecord(rec));
      }
      const missingSeeds = Array.from(this.publicItems.values()).filter(
        (item) => !savedRecords.some((r) => r.id === item.id),
      );
      if (missingSeeds.length > 0) {
        await this.db.publicDesigns.bulkPut(
          missingSeeds.map(toPublicDesignRecord),
        );
      }
    } catch {
      // IndexedDB가 없는 순수 jsdom 등의 테스트 환경에서는 인메모리 폴백 유지
    }
  }

  private async persistItem(item: PublicDesignItem): Promise<void> {
    try {
      await this.db.publicDesigns.put(toPublicDesignRecord(item));
    } catch {
      // 인메모리 폴백 유지
    }
  }

  private async persistItems(
    items: readonly PublicDesignItem[],
  ): Promise<void> {
    if (items.length === 0) return;
    try {
      await this.db.publicDesigns.bulkPut(items.map(toPublicDesignRecord));
    } catch {
      // 인메모리 폴백 유지
    }
  }

  private seedDefaultDesigns() {
    const seed1: PublicDesignItem = {
      id: 'pub-001',
      originalDesignId: 'orig-001',
      authorName: '브릿지마스터',
      title: '경량형 워런 트러스',
      description: '최소한의 부재로 최대 하중을 견디는 기본 트러스 구조입니다.',
      levelId: 'level-001',
      memberCount: 7,
      buildCost: 11800,
      reactionCounts: { like: 14, creative: 5, clever: 8 },
      userReactions: [],
      publishedAt: Date.now() - 3600000,
      snapshot: {
        id: 'orig-001',
        ownerId: 'author-1',
        title: '경량형 워런 트러스',
        description: '최소한의 부재로 최대 하중을 견디는 기본 트러스 구조입니다.',
        mode: 'stage',
        levelId: 'level-001',
        visibility: 'public',
        currentVersionId: 'v1',
        nodes: new Map([
          ['n1', { id: 'n1', x: 5, y: 9, nodeType: 'anchor' }],
          ['n2', { id: 'n2', x: 8, y: 9, nodeType: 'free' }],
          ['n3', { id: 'n3', x: 11, y: 9, nodeType: 'free' }],
          ['n4', { id: 'n4', x: 14, y: 9, nodeType: 'anchor' }],
          ['n5', { id: 'n5', x: 9, y: 7, nodeType: 'free' }],
        ]),
        members: new Map([
          ['m1', { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', materialType: 'standard', cost: 1500 }],
          ['m2', { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', materialType: 'standard', cost: 1500 }],
          ['m3', { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', materialType: 'standard', cost: 1500 }],
          ['m4', { id: 'm4', startNodeId: 'n1', endNodeId: 'n5', materialType: 'standard', cost: 2236 }],
          ['m5', { id: 'm5', startNodeId: 'n2', endNodeId: 'n5', materialType: 'standard', cost: 1118 }],
          ['m6', { id: 'm6', startNodeId: 'n3', endNodeId: 'n5', materialType: 'standard', cost: 1414 }],
          ['m7', { id: 'm7', startNodeId: 'n4', endNodeId: 'n5', materialType: 'standard', cost: 2693 }],
        ]),
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        syncStatus: 'synced',
        schemaVersion: 1,
      },
    };

    this.publicItems.set(seed1.id, seed1);
  }

  async getPublicDesigns(levelId?: EntityId): Promise<PublicDesignItem[]> {
    await this.ensureHydrated();
    const all = Array.from(this.publicItems.values());
    const filtered = levelId
      ? all.filter((item) => item.levelId === levelId)
      : all;
    return filtered.sort((a, b) => b.publishedAt - a.publishedAt);
  }

  private createPublicDesignItem(
    design: BridgeDesign,
    authorName: string,
    publishedAt: number,
    existing?: PublicDesignItem,
  ): PublicDesignItem {
    const publicId =
      existing?.id ??
      `pub-${publishedAt}-${Math.random().toString(36).slice(2, 6)}`;
    const totalCost = Array.from(design.members.values()).reduce(
      (acc, m) => acc + m.cost,
      0,
    );

    return {
      id: publicId,
      originalDesignId: design.id,
      authorName,
      title: design.title,
      description: design.description,
      levelId: design.levelId,
      memberCount: design.members.size,
      buildCost: totalCost,
      reactionCounts: existing
        ? { ...existing.reactionCounts }
        : { like: 0, creative: 0, clever: 0 },
      userReactions: existing ? [...existing.userReactions] : [],
      publishedAt,
      snapshot: { ...design, visibility: 'public' },
    };
  }

  async publishDesign(
    design: BridgeDesign,
    authorName: string,
  ): Promise<PublicDesignItem> {
    await this.ensureHydrated();
    const existing = Array.from(this.publicItems.values()).find(
      (item) => item.originalDesignId === design.id,
    );
    const publicItem = this.createPublicDesignItem(
      design,
      authorName,
      Date.now(),
      existing,
    );

    this.publicItems.set(publicItem.id, publicItem);
    await this.persistItem(publicItem);
    return publicItem;
  }

  async publishDesigns(
    designs: readonly BridgeDesign[],
    authorName: string,
  ): Promise<BulkPublishResult> {
    await this.ensureHydrated();
    const existingOriginalIds = new Set(
      Array.from(this.publicItems.values()).map(
        (item) => item.originalDesignId,
      ),
    );

    const published: PublicDesignItem[] = [];
    let skippedAlreadyPublished = 0;
    let skippedEmpty = 0;
    const baseTime = Date.now();

    designs.forEach((design, index) => {
      if (design.members.size === 0) {
        skippedEmpty++;
        return;
      }
      if (existingOriginalIds.has(design.id)) {
        skippedAlreadyPublished++;
        return;
      }

      const item = this.createPublicDesignItem(
        design,
        authorName,
        baseTime + (designs.length - index),
      );
      this.publicItems.set(item.id, item);
      existingOriginalIds.add(design.id);
      published.push(item);
    });

    await this.persistItems(published);

    return {
      published,
      skippedAlreadyPublished,
      skippedEmpty,
    };
  }

  async cloneDesign(
    publicDesignId: EntityId,
    newOwnerId: EntityId,
  ): Promise<BridgeDesign> {
    await this.ensureHydrated();
    const item = this.publicItems.get(publicDesignId);
    if (!item) {
      throw new Error('복제할 작품을 찾을 수 없습니다.');
    }

    const clonedId = `cloned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clonedDesign: BridgeDesign = {
      ...item.snapshot,
      id: clonedId,
      ownerId: newOwnerId,
      title: `${item.title} (복제본)`,
      visibility: 'private',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    };

    // 로컬 DB에 새 설계로 저장
    await this.db.designs.put(toDesignRecord(clonedDesign));
    return clonedDesign;
  }

  async toggleReaction(
    publicDesignId: EntityId,
    userId: EntityId,
    reaction: ReactionType,
  ): Promise<{ counts: Record<ReactionType, number>; active: boolean }> {
    await this.ensureHydrated();
    const item = this.publicItems.get(publicDesignId);
    if (!item) {
      throw new Error('작품을 찾을 수 없습니다.');
    }

    const key = `${publicDesignId}_${userId}`;
    let userSet = this.userReactions.get(key);
    if (!userSet) {
      userSet = new Set<ReactionType>();
      this.userReactions.set(key, userSet);
    }

    let active = false;
    if (userSet.has(reaction)) {
      // 반응 취소
      userSet.delete(reaction);
      item.reactionCounts[reaction] = Math.max(0, item.reactionCounts[reaction] - 1);
      active = false;
    } else {
      // 반응 등록
      userSet.add(reaction);
      item.reactionCounts[reaction]++;
      active = true;
    }

    await this.persistItem(item);

    return {
      counts: { ...item.reactionCounts },
      active,
    };
  }
}
