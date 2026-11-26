import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { BridgeDesign, BridgeVersion } from '@cozybridge/domain';
import { CozybridgeDatabase } from '../db/cozybridge-db.js';
import { IndexedDbDesignRepository } from '../repositories/design-repository.js';

describe('IndexedDbDesignRepository 로컬 저장소 테스트', () => {
  let db: CozybridgeDatabase;
  let repo: IndexedDbDesignRepository;

  beforeEach(() => {
    db = new CozybridgeDatabase(`test_db_${Date.now()}_${Math.random()}`);
    repo = new IndexedDbDesignRepository(db);
  });

  it('설계를 저장하고 ID로 복원할 수 있다', async () => {
    const design: BridgeDesign = {
      id: 'design-123',
      ownerId: 'user-1',
      title: '테스트 브릿지',
      description: '단단한 삼각형 구조',
      mode: 'stage',
      levelId: 'level-001',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map([
        ['n1', { id: 'n1', x: 2, y: 5, nodeType: 'anchor' }],
        ['n2', { id: 'n2', x: 6, y: 5, nodeType: 'free' }],
      ]),
      members: new Map([
        [
          'm1',
          {
            id: 'm1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            materialType: 'standard',
            cost: 2000,
          },
        ],
      ]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    await repo.save(design);

    const loaded = await repo.findById('design-123');
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe('테스트 브릿지');
    expect(loaded?.nodes.size).toBe(2);
    expect(loaded?.members.size).toBe(1);
    expect(loaded?.members.get('m1')?.cost).toBe(2000);
  });

  it('버전을 저장하고 히스토리를 순서대로 조회할 수 있다', async () => {
    const design: BridgeDesign = {
      id: 'design-456',
      ownerId: 'user-1',
      title: '버전 테스트',
      description: '',
      mode: 'stage',
      levelId: 'level-001',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map(),
      members: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    const v1: BridgeVersion = {
      id: 'v1',
      designId: 'design-456',
      versionNumber: 1,
      snapshot: design,
      createdAt: 1000,
    };

    const v2: BridgeVersion = {
      id: 'v2',
      designId: 'design-456',
      versionNumber: 2,
      snapshot: { ...design, title: '개선된 버전' },
      createdAt: 2000,
      parentVersionId: 'v1',
    };

    await repo.saveVersion(v1);
    await repo.saveVersion(v2);

    const versions = await repo.getVersionsByDesignId('design-456');
    expect(versions.length).toBe(2);
    expect(versions[0]?.versionNumber).toBe(1);
    expect(versions[1]?.versionNumber).toBe(2);
    expect(versions[1]?.snapshot.title).toBe('개선된 버전');
  });

  it('설계 삭제 시 관련 버전도 함께 삭제된다', async () => {
    const design: BridgeDesign = {
      id: 'design-delete',
      ownerId: 'user-1',
      title: '삭제할 설계',
      description: '',
      mode: 'stage',
      levelId: 'level-001',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map(),
      members: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    await repo.save(design);
    await repo.saveVersion({
      id: 'v-del',
      designId: 'design-delete',
      versionNumber: 1,
      snapshot: design,
      createdAt: Date.now(),
    });

    await repo.delete('design-delete');

    const loaded = await repo.findById('design-delete');
    expect(loaded).toBeNull();

    const versions = await repo.getVersionsByDesignId('design-delete');
    expect(versions.length).toBe(0);
  });
});
