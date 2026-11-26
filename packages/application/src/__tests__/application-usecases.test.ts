import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { BridgeDesign } from '@linebound/domain';
import {
  LineboundDatabase,
  getScopedDatabase,
  IndexedDbDesignRepository,
  IndexedDbLevelProgressRepository,
  IndexedDbSyncQueueRepository,
  CommunityRepository,
  LocalCurrencyRepository,
  SupabaseAuthService,
  SyncManager,
} from '@linebound/infrastructure';
import {
  SaveBridgeDesignUseCase,
  LoadBridgeDesignUseCase,
  CreateBridgeVersionUseCase,
  RestoreBridgeVersionUseCase,
  LevelProgressUseCase,
  AuthUseCase,
  SyncUseCase,
  CommunityUseCase,
  HintUseCase,
} from '../index.js';

describe('Application 유스케이스 종합 테스트 (Phase 2 & 3)', () => {
  let db: LineboundDatabase;
  let designRepo: IndexedDbDesignRepository;
  let progressRepo: IndexedDbLevelProgressRepository;
  let syncQueue: IndexedDbSyncQueueRepository;
  let communityRepo: CommunityRepository;
  let currencyRepo: LocalCurrencyRepository;
  let authService: SupabaseAuthService;
  let syncManager: SyncManager;

  let saveDesignUseCase: SaveBridgeDesignUseCase;
  let loadDesignUseCase: LoadBridgeDesignUseCase;
  let createVersionUseCase: CreateBridgeVersionUseCase;
  let restoreVersionUseCase: RestoreBridgeVersionUseCase;
  let progressUseCase: LevelProgressUseCase;
  let authUseCase: AuthUseCase;
  let syncUseCase: SyncUseCase;
  let communityUseCase: CommunityUseCase;
  let hintUseCase: HintUseCase;

  beforeEach(() => {
    db = new LineboundDatabase(`app_test_${Date.now()}_${Math.random()}`);
    designRepo = new IndexedDbDesignRepository(db);
    progressRepo = new IndexedDbLevelProgressRepository(db);
    syncQueue = new IndexedDbSyncQueueRepository(db);
    communityRepo = new CommunityRepository(db);
    currencyRepo = new LocalCurrencyRepository();
    authService = new SupabaseAuthService();
    syncManager = new SyncManager(syncQueue, designRepo, authService);

    saveDesignUseCase = new SaveBridgeDesignUseCase(designRepo);
    loadDesignUseCase = new LoadBridgeDesignUseCase(designRepo);
    createVersionUseCase = new CreateBridgeVersionUseCase(designRepo);
    restoreVersionUseCase = new RestoreBridgeVersionUseCase(
      designRepo,
      createVersionUseCase,
    );
    progressUseCase = new LevelProgressUseCase(progressRepo);
    authUseCase = new AuthUseCase(authService);
    syncUseCase = new SyncUseCase(syncQueue, syncManager);
    communityUseCase = new CommunityUseCase(communityRepo);
    hintUseCase = new HintUseCase(currencyRepo);
  });

  it('설계 저장 및 불러오기가 정상 작동한다', async () => {
    const design: BridgeDesign = {
      id: 'd1',
      ownerId: 'u1',
      title: '트러스 브릿지',
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

    await saveDesignUseCase.execute(design);
    const loaded = await loadDesignUseCase.execute('d1');

    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe('트러스 브릿지');
  });

  it('버전 복원 시 이전 스냅샷이 복원되고 새 버전이 누적 생성된다', async () => {
    const design: BridgeDesign = {
      id: 'd-version',
      ownerId: 'u1',
      title: '버전 1',
      description: '',
      mode: 'stage',
      levelId: 'level-001',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map([['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }]]),
      members: new Map(),
      createdAt: 1000,
      updatedAt: 1000,
      syncStatus: 'synced',
      schemaVersion: 1,
    };

    const v1 = await createVersionUseCase.execute(design);
    expect(v1.versionNumber).toBe(1);

    const designV2: BridgeDesign = {
      ...design,
      title: '버전 2 (수정됨)',
      nodes: new Map([
        ['n1', { id: 'n1', x: 0, y: 0, nodeType: 'anchor' }],
        ['n2', { id: 'n2', x: 5, y: 0, nodeType: 'free' }],
      ]),
    };
    const v2 = await createVersionUseCase.execute(designV2);
    expect(v2.versionNumber).toBe(2);

    const restored = await restoreVersionUseCase.execute(design.id, v1.id);
    expect(restored.title).toBe('버전 1');
    expect(restored.nodes.size).toBe(1);

    const versions = await restoreVersionUseCase.getVersions(design.id);
    expect(versions.length).toBe(3);
    expect(versions[2]?.versionNumber).toBe(3);
  });

  it('레벨 클리어 시 예산 대비 효율에 따라 별점이 산정되고 다음 레벨이 해금된다', async () => {
    let list = await progressUseCase.getLevelListView();
    expect(list[0]?.isUnlocked).toBe(true);
    expect(list[1]?.isUnlocked).toBe(false);

    await progressUseCase.completeLevel('level-001', 6000, 10000);

    list = await progressUseCase.getLevelListView();
    expect(list[0]?.isCompleted).toBe(true);
    expect(list[0]?.stars).toBe(3);
    expect(list[0]?.bestCost).toBe(6000);
    expect(list[1]?.isUnlocked).toBe(true);
  });

  it('AuthUseCase를 통한 회원가입, 로그인 및 세션 조회가 정상 동작한다', async () => {
    const session = await authUseCase.signUp('builder@test.com', 'pwd12345', '다리장인');
    expect(session.email).toBe('builder@test.com');
    expect(session.displayName).toBe('다리장인');

    const current = await authUseCase.getCurrentSession();
    expect(current?.userId).toBe(session.userId);

    await authUseCase.signOut();
    const afterLogout = await authUseCase.getCurrentSession();
    expect(afterLogout).toBeNull();
  });

  it('SyncUseCase를 통해 로컬 변경 사항을 예약하고 일괄 전송할 수 있다', async () => {
    await authUseCase.signIn('builder@test.com', 'pwd12345');

    await designRepo.save({
      id: 'd-sync-usecase',
      ownerId: 'builder',
      title: '큐 테스트',
      description: '',
      mode: 'stage',
      levelId: 'level-001',
      visibility: 'private',
      currentVersionId: 'v1',
      nodes: new Map(),
      members: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      schemaVersion: 1,
    });

    await syncUseCase.queueDesignChange('d-sync-usecase', 'create', '{}');
    expect(await syncUseCase.getPendingCount()).toBe(1);

    const result = await syncUseCase.syncNow();
    expect(result.succeeded).toBe(1);
    expect(await syncUseCase.getPendingCount()).toBe(0);
  });

  it('CommunityUseCase: 공개 작품 열람, 복제 및 반응 토글이 정상 동작한다', async () => {
    const publicItems = await communityUseCase.getPublicDesigns();
    expect(publicItems.length).toBeGreaterThan(0);

    const firstItem = publicItems[0]!;

    // 작품 복제
    const cloned = await communityUseCase.cloneDesign(firstItem.id, 'new-user-123');
    expect(cloned.ownerId).toBe('new-user-123');
    expect(cloned.title).toContain('(복제본)');
    expect(cloned.visibility).toBe('private');

    // 반응(좋아요) 토글
    const initialLikeCount = firstItem.reactionCounts.like;
    const react1 = await communityUseCase.toggleReaction(firstItem.id, 'user-a', 'like');
    expect(react1.active).toBe(true);
    expect(react1.counts.like).toBe(initialLikeCount + 1);

    // 같은 유저가 다시 누르면 취소
    const react2 = await communityUseCase.toggleReaction(firstItem.id, 'user-a', 'like');
    expect(react2.active).toBe(false);
    expect(react2.counts.like).toBe(initialLikeCount);
  });

  it('HintUseCase: 힌트 조회 및 코인 차감 후 열람이 정상 동작한다', async () => {
    const hints = await hintUseCase.getHints('level-001');
    expect(hints.length).toBeGreaterThan(0);
    expect(hints[0]?.isUnlocked).toBe(false);

    const initialBalance = await hintUseCase.getBalance();
    const firstHint = hints[0]!;

    const result = await hintUseCase.unlockHint(firstHint);
    expect(result.remainingBalance).toBe(initialBalance - firstHint.cost);

    const hintsAfter = await hintUseCase.getHints('level-001');
    expect(hintsAfter[0]?.isUnlocked).toBe(true);
  });

  it('같은 이메일로 중복 회원가입이 차단되며, 다른 이메일로 가입한 계정은 진행 상황과 도면 보관함이 완전히 분리된다', async () => {
    const strictAuth = new AuthUseCase(
      new SupabaseAuthService(undefined, undefined, { strictLocalAuth: true }),
    );

    // 1. 계정 A 가입 후 1단계 클리어 및 다리 저장
    const accountA = await strictAuth.signUp(
      'player1@linebound.com',
      'pass1234',
      '첫번째유저',
    );
    const dbA = getScopedDatabase(accountA.userId);
    const progressA = new LevelProgressUseCase(
      new IndexedDbLevelProgressRepository(dbA),
    );
    const saveA = new SaveBridgeDesignUseCase(new IndexedDbDesignRepository(dbA));
    const loadA = new LoadBridgeDesignUseCase(new IndexedDbDesignRepository(dbA));

    await progressA.completeLevel('level-001', 7000, 40000);
    await saveA.execute({
      id: 'design-acct-a',
      ownerId: accountA.userId,
      title: 'A의 다리',
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
    });

    await strictAuth.signOut();

    // 2. 똑같은 이메일로 다시 회원가입 시도 -> 즉시 차단되어야 함
    await expect(
      strictAuth.signUp('player1@linebound.com', 'newpass99', '덮어쓰기시도'),
    ).rejects.toThrow(/이미 가입된 이메일/);

    // 3. 다른 이메일(계정 B)로 새로 가입 -> 진행 상황과 도면이 깨끗하게 초기화되어 분리됨
    const accountB = await strictAuth.signUp(
      'player2@linebound.com',
      'pass5678',
      '두번째유저',
    );
    expect(accountB.userId).not.toBe(accountA.userId);

    const dbB = getScopedDatabase(accountB.userId);
    const progressB = new LevelProgressUseCase(
      new IndexedDbLevelProgressRepository(dbB),
    );
    const loadB = new LoadBridgeDesignUseCase(new IndexedDbDesignRepository(dbB));

    const listB = await progressB.getLevelListView();
    expect(listB[0]?.isCompleted).toBe(false);
    expect(listB[1]?.isUnlocked).toBe(false);
    expect(await loadB.getAllDesigns()).toHaveLength(0);

    // 4. 계정 A의 진행 상황과 도면은 그대로 안전하게 보존됨
    const listA = await progressA.getLevelListView();
    expect(listA[0]?.isCompleted).toBe(true);
    expect(listA[1]?.isUnlocked).toBe(true);
    expect(await loadA.getAllDesigns()).toHaveLength(1);
  });
});
