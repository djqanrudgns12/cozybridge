import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { BridgeDesign } from '@cozybridge/domain';
import { CozybridgeDatabase, getScopedDatabase } from '../db/cozybridge-db.js';
import { IndexedDbDesignRepository } from '../repositories/design-repository.js';
import { IndexedDbLevelProgressRepository } from '../repositories/level-progress-repository.js';
import { IndexedDbSyncQueueRepository } from '../repositories/sync-queue-repository.js';
import { SupabaseAuthService } from '../auth/auth-service.js';
import { SyncManager } from '../sync/sync-manager.js';

describe('동기화 큐 및 인증 서비스 테스트 (Phase 2)', () => {
  let db: CozybridgeDatabase;
  let syncQueue: IndexedDbSyncQueueRepository;
  let designRepo: IndexedDbDesignRepository;
  let authService: SupabaseAuthService;
  let syncManager: SyncManager;

  beforeEach(() => {
    db = new CozybridgeDatabase(`sync_test_${Date.now()}_${Math.random()}`);
    syncQueue = new IndexedDbSyncQueueRepository(db);
    designRepo = new IndexedDbDesignRepository(db);
    authService = new SupabaseAuthService();
    syncManager = new SyncManager(syncQueue, designRepo, authService);
  });

  it('게스트 로그인 시 오프라인 세션이 활성화된다', () => {
    const session = authService.signInAsGuest();
    expect(session.isOffline).toBe(true);
    expect(session.displayName).toBe('게스트 엔지니어');
  });

  it('동기화 큐에 작업 추가 및 pending 조회가 정상 동작한다', async () => {
    const op = await syncQueue.enqueue(
      'design',
      'd-100',
      'create',
      JSON.stringify({ title: '테스트' }),
    );

    expect(op.status).toBe('pending');
    expect(op.attemptCount).toBe(0);

    const pending = await syncQueue.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0]?.entityId).toBe('d-100');

    // 상태 업데이트
    await syncQueue.updateStatus(op.id, 'failed', '네트워크 타임아웃');
    const updated = await syncQueue.getPending();
    expect(updated[0]?.attemptCount).toBe(1);
    expect(updated[0]?.lastError).toBe('네트워크 타임아웃');
  });

  it('오프라인/게스트 상태에서는 큐 작업을 전송하지 않고 보류한다', async () => {
    authService.signInAsGuest();

    await syncQueue.enqueue('design', 'd-200', 'update', '{}');

    const result = await syncManager.processQueue();
    expect(result.processed).toBe(0);
    expect(await syncQueue.count()).toBe(1);
  });

  it('온라인 로그인 후 큐 작업이 성공적으로 처리되고 synced 상태로 전환된다', async () => {
    // 1. 설계 저장
    const design: BridgeDesign = {
      id: 'd-sync-1',
      ownerId: 'user-online',
      title: '동기화 테스트 다리',
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
    };
    await designRepo.save(design);

    // 2. 동기화 큐 등록
    await syncQueue.enqueue('design', 'd-sync-1', 'create', '{}');

    // 3. 온라인 로그인
    await authService.signIn('engineer@cozybridge.com', 'secret1234');

    // 4. 큐 프로세스 실행
    const result = await syncManager.processQueue();
    expect(result.succeeded).toBe(1);
    expect(await syncQueue.count()).toBe(0);

    // 5. 로컬 설계의 syncStatus가 synced로 갱신되었는지 확인
    const updatedDesign = await designRepo.findById('d-sync-1');
    expect(updatedDesign?.syncStatus).toBe('synced');
  });

  it('회원가입 시 입력한 별명이 로그아웃 후 재로그인해도 이메일 앞글자로 덮어써지지 않고 유지된다', async () => {
    const signedUp = await authService.signUp(
      'minjun@school.kr',
      'secret1234',
      '튼튼다리왕',
    );
    expect(signedUp.displayName).toBe('튼튼다리왕');

    await authService.signOut();
    expect(await authService.getCurrentSession()).toBeNull();

    const signedIn = await authService.signIn('minjun@school.kr', 'secret1234');
    expect(signedIn.displayName).toBe('튼튼다리왕');
    expect(signedIn.userId).toBe(signedUp.userId);
  });

  it('게스트 지정 별명 시작 및 updateDisplayName을 통한 별명 변경이 정상 반영된다', async () => {
    const customGuest = authService.signInAsGuest('초코엔지니어');
    expect(customGuest.displayName).toBe('초코엔지니어');
    expect(customGuest.isOffline).toBe(true);

    const renamedGuest = await authService.updateDisplayName('다리대장');
    expect(renamedGuest.displayName).toBe('다리대장');

    await authService.signUp('hero@cozybridge.com', 'secret1234', '원래별명');
    const renamedAccount = await authService.updateDisplayName('바꾼별명');
    expect(renamedAccount.displayName).toBe('바꾼별명');

    await authService.signOut();
    const relogin = await authService.signIn('hero@cozybridge.com', 'secret1234');
    expect(relogin.displayName).toBe('바꾼별명');
  });

  it('이미 가입된 이메일 주소(대소문자·공백 포함)로 다시 회원가입을 시도하면 차단되고 기존 계정이 보존된다', async () => {
    const first = await authService.signUp(
      'same@cozybridge.com',
      'firstPass123',
      '원조건축가',
    );

    await authService.signOut();

    await expect(
      authService.signUp('  SAME@Cozybridge.com ', 'otherPass999', '새계정시도'),
    ).rejects.toThrow(/이미 가입된 이메일/);

    // 틀린 비밀번호 로그인도 차단되어야 함
    await expect(
      authService.signIn('same@cozybridge.com', 'otherPass999'),
    ).rejects.toThrow(/비밀번호/);

    // 원래 비밀번호로 로그인하면 원래 userId와 별명이 그대로 유지됨
    const relogin = await authService.signIn(
      'same@cozybridge.com',
      'firstPass123',
    );
    expect(relogin.userId).toBe(first.userId);
    expect(relogin.displayName).toBe('원조건축가');
  });

  it('계정별 스코프 DB(getScopedDatabase)는 서로 다른 계정의 진행 상황과 도면을 완전히 격리한다', async () => {
    const userA = await authService.signUp('a@cozybridge.com', 'pass1234', '유저A');
    await authService.signOut();
    const userB = await authService.signUp('b@cozybridge.com', 'pass1234', '유저B');

    expect(userA.userId).not.toBe(userB.userId);

    const progressRepoA = new IndexedDbLevelProgressRepository(
      getScopedDatabase(userA.userId),
    );
    const progressRepoB = new IndexedDbLevelProgressRepository(
      getScopedDatabase(userB.userId),
    );
    const progressRepoGuest = new IndexedDbLevelProgressRepository(
      getScopedDatabase('local-guest'),
    );

    await progressRepoA.saveProgress('level-001', 7500, 3);

    expect((await progressRepoA.getProgress('level-001'))?.completed).toBe(true);
    expect(await progressRepoB.getProgress('level-001')).toBeNull();
    expect(await progressRepoGuest.getProgress('level-001')).toBeNull();
  });
});
