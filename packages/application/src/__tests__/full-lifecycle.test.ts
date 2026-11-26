import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { BridgeDesign } from '@cozybridge/domain';
import {
  CozybridgeDatabase,
  IndexedDbDesignRepository,
  IndexedDbLevelProgressRepository,
  IndexedDbSyncQueueRepository,
  CommunityRepository,
  LocalCurrencyRepository,
  SupabaseAuthService,
  SyncManager,
} from '@cozybridge/infrastructure';
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
import { MatterBridgeEngine } from '@cozybridge/simulation';
import { getLevelById } from '@cozybridge/content';

describe('Cozybridge 전체 생명주기 E2E 통합 검증 (PRD Part 12, Part 16)', () => {
  let db: CozybridgeDatabase;
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
  let physicsEngine: MatterBridgeEngine;

  beforeEach(() => {
    db = new CozybridgeDatabase(`e2e_test_${Date.now()}_${Math.random()}`);
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
    physicsEngine = new MatterBridgeEngine();
  });

  it('전체 사용자 핵심 루프: 오프라인 건설 -> 물리 시험 통과 -> 레벨 클리어 & 해금 -> 버전 관리 -> 힌트 사용 -> 온라인 동기화', async () => {
    // 1. 오프라인 게스트 모드 진입 (FR-002)
    const guestSession = authUseCase.signInAsGuest();
    expect(guestSession.isOffline).toBe(true);

    // 2. 레벨 1 로드 및 해금 상태 확인 (FR-003, FR-009)
    const level1 = getLevelById('level-001')!;
    expect(level1).toBeDefined();

    let levelList = await progressUseCase.getLevelListView();
    expect(levelList[0]?.isUnlocked).toBe(true);
    expect(levelList[1]?.isUnlocked).toBe(false); // 레벨 2는 아직 잠김

    // 3. 다리 설계 구축 (FR-004, FR-005, FR-006)
    // 앵커 5,9 와 14,9 사이를 삼각형 트러스로 보강한 튼튼한 다리
    const nodes = new Map([
      ['n-left', { id: 'n-left', x: 5, y: 9, nodeType: 'anchor' as const, anchorId: 'anchor-left' }],
      ['n-mid1', { id: 'n-mid1', x: 8, y: 9, nodeType: 'free' as const }],
      ['n-mid2', { id: 'n-mid2', x: 11, y: 9, nodeType: 'free' as const }],
      ['n-right', { id: 'n-right', x: 14, y: 9, nodeType: 'anchor' as const, anchorId: 'anchor-right' }],
      ['n-sub1', { id: 'n-sub1', x: 8, y: 11, nodeType: 'free' as const }],
      ['n-sub2', { id: 'n-sub2', x: 11, y: 11, nodeType: 'free' as const }],
    ]);

    const members = new Map([
      ['m1', { id: 'm1', startNodeId: 'n-left', endNodeId: 'n-mid1', materialType: 'standard' as const, cost: 1500 }],
      ['m2', { id: 'm2', startNodeId: 'n-mid1', endNodeId: 'n-mid2', materialType: 'standard' as const, cost: 1500 }],
      ['m3', { id: 'm3', startNodeId: 'n-mid2', endNodeId: 'n-right', materialType: 'standard' as const, cost: 1500 }],
      ['m4', { id: 'm4', startNodeId: 'n-left', endNodeId: 'n-sub1', materialType: 'standard' as const, cost: 1803 }],
      ['m5', { id: 'm5', startNodeId: 'n-mid1', endNodeId: 'n-sub1', materialType: 'standard' as const, cost: 1000 }],
      ['m6', { id: 'm6', startNodeId: 'n-sub1', endNodeId: 'n-mid2', materialType: 'standard' as const, cost: 1803 }],
      ['m7', { id: 'm7', startNodeId: 'n-sub1', endNodeId: 'n-sub2', materialType: 'standard' as const, cost: 1500 }],
      ['m8', { id: 'm8', startNodeId: 'n-mid2', endNodeId: 'n-sub2', materialType: 'standard' as const, cost: 1000 }],
      ['m9', { id: 'm9', startNodeId: 'n-sub2', endNodeId: 'n-right', materialType: 'standard' as const, cost: 1803 }],
    ]);

    const design: BridgeDesign = {
      id: 'design-e2e-001',
      ownerId: guestSession.userId,
      title: 'E2E 다리 설계',
      description: '통합 검증용 브릿지',
      mode: 'stage',
      levelId: level1.id,
      visibility: 'private',
      currentVersionId: 'v1',
      nodes,
      members,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
      schemaVersion: 1,
    };

    // 4. 물리 시뮬레이션 시험 (FR-007, FR-008)
    const initStatus = physicsEngine.initialize(design, level1);
    expect(initStatus).toBe('ready');

    for (let frame = 0; frame < 600; frame++) {
      physicsEngine.step(1 / 60);
      const status = physicsEngine.getStatus();
      if (status === 'success' || status === 'failure') break;
    }

    // 물리 엔진 통과(success) 확인
    expect(physicsEngine.getStatus()).toBe('success');

    // 5. 단계 클리어 및 다음 단계 해금 검증 (FR-006, FR-009)
    const totalCost = 4500; // 예산 10000의 45% -> 3스타
    await progressUseCase.completeLevel(level1.id, totalCost, level1.budget);

    levelList = await progressUseCase.getLevelListView();
    expect(levelList[0]?.isCompleted).toBe(true);
    expect(levelList[0]?.stars).toBe(3);
    expect(levelList[1]?.isUnlocked).toBe(true); // 레벨 2가 정상 해금됨!

    // 6. 설계 로컬 저장 및 버전 생성 (FR-011, FR-012)
    await saveDesignUseCase.execute(design);
    const v1 = await createVersionUseCase.execute(design);
    expect(v1.versionNumber).toBe(1);

    const loadedDesign = await loadDesignUseCase.execute(design.id);
    expect(loadedDesign?.id).toBe(design.id);

    const restored = await restoreVersionUseCase.execute(design.id, v1.id);
    expect(restored.id).toBe(design.id);

    // 7. 힌트 확인 및 코인 차감 (FR-016)
    const hints = await hintUseCase.getHints(level1.id);
    expect(hints.length).toBeGreaterThan(0);
    const initialCoin = await hintUseCase.getBalance();
    const unlockRes = await hintUseCase.unlockHint(hints[0]!);
    expect(unlockRes.remainingBalance).toBe(initialCoin - hints[0]!.cost);

    // 8. 커뮤니티 작품 복제 (FR-014, FR-015)
    const publicItems = await communityUseCase.getPublicDesigns();
    const clonedDesign = await communityUseCase.cloneDesign(publicItems[0]!.id, guestSession.userId);
    expect(clonedDesign.title).toContain('(복제본)');

    // 9. 오프라인 변경 사항 큐 예약 후 온라인 동기화 (FR-013)
    await syncUseCase.queueDesignChange(design.id, 'create', '{}');
    expect(await syncUseCase.getPendingCount()).toBe(1);

    // 오프라인 상태에서는 전송 대기
    let syncRes = await syncUseCase.syncNow();
    expect(syncRes.processed).toBe(0);

    // 온라인 계정으로 로그인 후 동기화 재시도
    await authUseCase.signIn('online-engineer@cozybridge.com', 'password123');
    syncRes = await syncUseCase.syncNow();
    expect(syncRes.succeeded).toBe(1);
    expect(await syncUseCase.getPendingCount()).toBe(0);

    const syncedDesign = await loadDesignUseCase.execute(design.id);
    expect(syncedDesign?.syncStatus).toBe('synced');
  });
});
