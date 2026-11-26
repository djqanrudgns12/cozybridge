import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  IndexedDbLevelProgressRepository,
  type LevelProgressRecord,
} from '@linebound/infrastructure';
import { ThemeProvider } from '../styles/ThemeContext';
import { AuthModal } from '../components/AuthModal';
import { HintModal } from '../components/HintModal';
import { SimulationResultModal } from '../components/SimulationResultModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MainMenu } from '../screens/MainMenu';
import { appAuthUseCase } from '../utils/auth-client';
import { markLessonCompleted } from '../utils/lesson-progress';
import { getUserDatabase } from '../utils/user-storage';

describe('Linebound 전 영역 리뉴얼 모달 및 UI 검증', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await appAuthUseCase.signOut();
  });

  it('AuthModal (7-3): 첫 화면에 [바로 놀기]와 [내 계정 로그인] 2열 카드를 보여주고 게스트 시작이 즉시 동작한다', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <ThemeProvider>
        <AuthModal
          isOpen
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      </ThemeProvider>,
    );

    expect(await screen.findByText('어떻게 시작할까요?')).toBeDefined();
    expect(screen.getByText('바로 놀기')).toBeDefined();
    expect(screen.getByText('내 계정 로그인')).toBeDefined();

    fireEvent.click(screen.getByText('바로 놀기'));
    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('AuthModal: 내가 직접 입력한 별명으로 게스트 시작·계정 로그인·별명 변경이 정확히 유지된다', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    const { unmount } = render(
      <ThemeProvider>
        <AuthModal isOpen onSuccess={handleSuccess} onClose={handleClose} />
      </ThemeProvider>,
    );

    const chooseInput = await screen.findByLabelText('게임에서 부를 내 별명');
    fireEvent.change(chooseInput, { target: { value: '슈퍼다리왕' } });
    fireEvent.click(screen.getByText('바로 놀기'));

    expect(handleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: '슈퍼다리왕',
        isOffline: true,
      }),
    );
    unmount();

    // 계정 가입 후 로그아웃 → 로그인하기 시 이메일 앞글자가 아닌 가입 별명이 자동 복원되는지 확인
    const accountSuccess = vi.fn();
    const { unmount: unmountSignup } = render(
      <ThemeProvider>
        <AuthModal isOpen onSuccess={accountSuccess} onClose={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByText('내 계정 로그인'));
    fireEvent.click(screen.getByText('새로 가입하기'));
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'randomid99@example.com' },
    });
    fireEvent.change(screen.getByLabelText('내 별명'), {
      target: { value: '짱구건축가' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('계정 만들고 시작하기'));

    await waitFor(() => {
      expect(accountSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'randomid99@example.com',
          displayName: '짱구건축가',
        }),
      );
    });
    unmountSignup();

    await appAuthUseCase.signOut();

    const reloginSuccess = vi.fn();
    const { unmount: unmountSignin } = render(
      <ThemeProvider>
        <AuthModal isOpen onSuccess={reloginSuccess} onClose={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByText('내 계정 로그인'));
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'randomid99@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('로그인 완료'));

    await waitFor(() => {
      expect(reloginSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: '짱구건축가',
        }),
      );
    });
    unmountSignin();
  });

  it('HintModal (7-3): 그림 슬라이드 비법 노트(1 / 2)가 열리고 다음 비법으로 넘길 수 있다', async () => {
    render(
      <ThemeProvider>
        <HintModal isOpen levelId="level-001" onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(await screen.findByText('다리 비법 노트')).toBeDefined();
    expect(screen.getByText('1 / 2')).toBeDefined();
    expect(
      screen.getByText('양쪽 노란 고정 핀을 먼저 이어보세요'),
    ).toBeDefined();

    fireEvent.click(screen.getByText('다음 비법'));
    expect(screen.getByText('2 / 2')).toBeDefined();
    expect(
      screen.getByText('네모보다 세모가 훨씬 튼튼해요!'),
    ).toBeDefined();
  });

  it('SimulationResultModal (5-3): 실패 시 [왜 무너졌을까요?]와 [이렇게 해보세요!] 2단 코칭 카드를 렌더링한다', async () => {
    const handleOpenHint = vi.fn();
    const handleRetry = vi.fn();

    render(
      <ThemeProvider>
        <SimulationResultModal
          isOpen
          status="failure"
          failureReport={{
            category: 'excessive_displacement',
            eventTime: 1.2,
            nodeIds: [],
            memberIds: [],
            severity: 0.9,
            confidence: 0.95,
            playerFacingMessageKey: 'failure.excessive_displacement',
          }}
          buildCost={4500}
          budget={40000}
          memberCount={3}
          onRetry={handleRetry}
          onOpenHint={handleOpenHint}
          onClose={handleRetry}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText('다리 가운데가 아래로 휘었어요!'),
    ).toBeDefined();
    expect(screen.getByText('왜 무너졌을까요?')).toBeDefined();
    expect(screen.getByText('이렇게 해보세요!')).toBeDefined();

    fireEvent.click(screen.getByText('비법 노트 열기'));
    expect(handleOpenHint).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog (7-3): 브라우저 confirm 대신 친절한 확인/취소 다이얼로그로 동작한다', async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ThemeProvider>
        <ConfirmDialog
          isOpen
          tone="danger"
          title="놓아둔 막대를 모두 지울까요?"
          description="실수로 지워도 되돌릴 수 있어요."
          confirmLabel="네, 모두 비울래요"
          cancelLabel="그냥 둘래요"
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText('놓아둔 막대를 모두 지울까요?'),
    ).toBeDefined();
    fireEvent.click(screen.getByText('네, 모두 비울래요'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('AuthModal: 회원가입 탭에 이미 가입된 이메일을 넣는 순간 기존 별명이 복제되지 않고 중복 가입이 즉시 차단된다', async () => {
    await appAuthUseCase.signUp('dup@example.com', '123456', '원래계정별명');
    await appAuthUseCase.signOut();

    const handleSuccess = vi.fn();
    render(
      <ThemeProvider>
        <AuthModal isOpen onSuccess={handleSuccess} onClose={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.click(await screen.findByText('내 계정 로그인'));
    fireEvent.click(screen.getByText('새로 가입하기'));

    const emailInput = screen.getByLabelText('이메일 주소');
    const nicknameInput = screen.getByLabelText('내 별명') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'dup@example.com' } });

    // 기존 계정의 별명이 회원가입 입력칸에 자동으로 따라오지 않아야 함
    expect(nicknameInput.value).toBe('');

    // 중복 이메일 안내가 즉시 표시되고 가입 버튼이 비활성화되어야 함
    expect(
      await screen.findByText(/이미 가입된 이메일 주소예요/),
    ).toBeDefined();
    const submitBtn = screen.getByRole('button', {
      name: '계정 만들고 시작하기',
    }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
    expect(handleSuccess).not.toHaveBeenCalled();

    // [로그인하기 탭으로 이동] 클릭 시 로그인 탭으로 전환되고 저장된 별명이 복원됨
    fireEvent.click(screen.getByText('로그인하기 탭으로 이동'));
    expect(nicknameInput.value).toBe('원래계정별명');
  });

  it('MainMenu & 진행 상황 분리: 계정별로 단계 도전 진행도와 수업 완료 기록이 독립적으로 유지된다', async () => {
    const userA = await appAuthUseCase.signUp(
      'first@example.com',
      '123456',
      '첫째엔지니어',
    );
    await appAuthUseCase.signOut();
    const userB = await appAuthUseCase.signUp(
      'second@example.com',
      '123456',
      '둘째엔지니어',
    );

    const dbNameA = getUserDatabase(userA.userId).name;
    const dbNameB = getUserDatabase(userB.userId).name;
    expect(dbNameA).not.toBe(dbNameB);

    markLessonCompleted('lesson-001', userA.userId);
    markLessonCompleted('lesson-002', userA.userId);

    const spy = vi
      .spyOn(IndexedDbLevelProgressRepository.prototype, 'getAllProgress')
      .mockImplementation(async function (
        this: IndexedDbLevelProgressRepository,
      ) {
        const internalDb = (this as unknown as { db: { name: string } }).db;
        if (internalDb.name === dbNameA) {
          return new Map<string, LevelProgressRecord>([
            [
              'level-001',
              {
                levelId: 'level-001',
                completed: true,
                bestCost: 8000,
                stars: 3,
                lastPlayedAt: Date.now(),
              },
            ],
          ]);
        }
        return new Map();
      });

    try {
      const { rerender } = render(
        <ThemeProvider>
          <MainMenu
            session={userA}
            onNavigate={vi.fn()}
            onSelectDesign={vi.fn()}
          />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/2단계 ·/)).toBeDefined();
      });
      expect(screen.getByText(/2\/8교시 완료/)).toBeDefined();

      // 다른 계정(userB)으로 전환 시 즉시 초기 진행 상황(1단계, 0교시 완료)으로 분리됨
      rerender(
        <ThemeProvider>
          <MainMenu
            session={userB}
            onNavigate={vi.fn()}
            onSelectDesign={vi.fn()}
          />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/1단계 · 첫 번째 다리/)).toBeDefined();
      });
      expect(screen.getByText(/0\/8교시 완료/)).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });
});
