import { useState, useEffect, useMemo } from 'react';
import type { BridgeDesign } from '@cozybridge/domain';
import { LESSONS } from '@cozybridge/content';
import type { UserSession } from '@cozybridge/infrastructure';
import { LevelProgressUseCase } from '@cozybridge/application';
import { IndexedDbLevelProgressRepository } from '@cozybridge/infrastructure';
import { APP_NAME, APP_VERSION } from '../app/app-meta';
import { AuthModal } from '../components/AuthModal';
import {
  BridgeHubModal,
  type BridgeHubTab,
} from '../components/BridgeHubModal';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import { appAuthUseCase } from '../utils/auth-client';
import { getCompletedLessonIds } from '../utils/lesson-progress';
import {
  getUserDatabase,
  resolveEffectiveStorageScope,
  resolveEffectiveUserId,
} from '../utils/user-storage';
import {
  ArrowRightIcon,
  BeamToolIcon,
  CopyWorkspaceIcon,
  EditPenIcon,
  FolderIcon,
  PlayIcon,
  SchoolBookIcon,
  StarIcon,
  UserIcon,
} from '../components/ui/Icons';

interface MainMenuProps {
  session?: UserSession | null;
  onSessionChange?: (session: UserSession | null) => void;
  onNavigate: (
    screen: 'stage-select' | 'sandbox' | 'build' | 'lesson-select' | 'lesson',
    levelId?: string,
  ) => void;
  onSelectDesign: (design: BridgeDesign) => void;
}

const DEFAULT_RECOMMENDED_LEVEL = {
  id: 'level-001',
  stepNumber: 1,
  title: '첫 번째 다리',
};

/**
 * 섹션 1-1 메인 메뉴
 * - 중앙 히어로 [이어서 다리 짓기] 풀폭 버튼 + 하단 2×2 균등 메뉴 타일
 * - 넉넉한 코너 안전 패딩(p-5)으로 어떤 해상도에서도 글자가 테두리 밖으로 삐져나오지 않습니다.
 */
export function MainMenu({
  session: controlledSession,
  onSessionChange,
  onNavigate,
  onSelectDesign,
}: MainMenuProps) {
  const [hubTab, setHubTab] = useState<BridgeHubTab | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'auth' | 'rename'>('auth');
  const [internalSession, setInternalSession] = useState<UserSession | null>(
    () => appAuthUseCase.getActiveSessionSync(),
  );
  const [recommendedLevel, setRecommendedLevel] = useState(
    DEFAULT_RECOMMENDED_LEVEL,
  );

  const session =
    controlledSession !== undefined ? controlledSession : internalSession;

  const updateSession = (next: UserSession | null) => {
    setInternalSession(next);
    onSessionChange?.(next);
  };

  useEffect(() => {
    if (controlledSession !== undefined) return;
    void appAuthUseCase.getCurrentSession().then((s) => {
      setInternalSession(s);
    });
  }, [controlledSession]);

  const effectiveUserId = resolveEffectiveUserId(session?.userId);
  const effectiveScope = resolveEffectiveStorageScope(session?.userId);

  // 계정이 바뀔 때마다 해당 계정의 단계 도전 진행도를 다시 불러와 반영
  useEffect(() => {
    let cancelled = false;
    setRecommendedLevel(DEFAULT_RECOMMENDED_LEVEL);

    try {
      const db = getUserDatabase(effectiveUserId);
      const progressRepo = new IndexedDbLevelProgressRepository(db);
      const progressUseCase = new LevelProgressUseCase(progressRepo);
      progressUseCase
        .getLevelListView()
        .then((items) => {
          if (cancelled || items.length === 0) return;
          const targetIdx = items.findIndex(
            (it) => it.isUnlocked && !it.isCompleted,
          );
          const chosenIdx =
            targetIdx >= 0
              ? targetIdx
              : Math.max(
                  0,
                  items.map((it) => it.isUnlocked).lastIndexOf(true),
                );
          const chosen = items[chosenIdx];
          if (chosen) {
            setRecommendedLevel({
              id: chosen.level.id,
              stepNumber: chosenIdx + 1,
              title: chosen.level.title,
            });
          }
        })
        .catch(() => {
          // 기본 1단계 유지
        });
    } catch {
      // IndexedDB 미지원 테스트 환경 폴백
    }

    return () => {
      cancelled = true;
    };
  }, [effectiveScope, effectiveUserId]);

  const handleLogout = async () => {
    await appAuthUseCase.signOut();
    updateSession(null);
  };

  const openAuthChoiceModal = () => {
    setAuthModalMode('auth');
    setIsAuthModalOpen(true);
  };

  const openRenameModal = () => {
    setAuthModalMode('rename');
    setIsAuthModalOpen(true);
  };

  const completedLessonCount = useMemo(
    () => getCompletedLessonIds(effectiveUserId).size,
    [effectiveScope, effectiveUserId],
  );

  const subTiles = [
    {
      id: 'stage-select',
      label: '단계별 도전',
      desc: '쉬운 계곡부터 차근차근 별 모으기',
      icon: <StarIcon size={20} filled={false} />,
      onClick: () => onNavigate('stage-select'),
    },
    {
      id: 'sandbox',
      label: '자유 만들기',
      desc: '돈 걱정 없이 마음껏 큰 다리 실험하기',
      icon: <BeamToolIcon size={20} />,
      onClick: () => onNavigate('sandbox'),
    },
    {
      id: 'my-designs',
      label: '내 다리 보관함',
      desc: '내가 만들고 저장한 다리 다시 열기',
      icon: <FolderIcon size={20} />,
      onClick: () => setHubTab('designs'),
    },
    {
      id: 'explore',
      label: '다리 광장',
      desc: '친구들이 만든 멋진 다리 구경하기',
      icon: <CopyWorkspaceIcon size={20} />,
      onClick: () => setHubTab('explore'),
    },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-craft-bg text-craft-ink select-none overflow-y-auto">
      {/* ─── 상단 바 (좌측 작업실 마크 · 우측 테마 스위처 & 계정 캡슐) ─── */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2.5 text-craft-ink">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-craft-surface border-[1.5px] border-craft-border">
            <img
              src="./icon-192.png"
              alt="Cozybridge 아이콘"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-sm font-extrabold tracking-tight">
            Cozybridge 작업실
          </span>
          <span className="rounded-full bg-craft-subtle border border-craft-border px-2 py-0.5 text-[11px] font-bold text-craft-muted">
            v{APP_VERSION}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeSwitcher />

          {session ? (
            <div className="flex items-center gap-2 rounded-[12px] bg-craft-surface border-[1.5px] border-craft-border-strong px-3 py-1.5 text-xs">
              <button
                type="button"
                onClick={openRenameModal}
                className="flex items-center gap-1.5 rounded-[8px] px-1.5 py-0.5 font-extrabold text-craft-ink hover:bg-craft-subtle hover:text-craft-primary transition-colors cursor-pointer"
                title="클릭해서 내 별명 바꾸기"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    session.isOffline ? 'bg-craft-amber' : 'bg-craft-sage'
                  }`}
                />
                <span>{session.displayName}</span>
                <EditPenIcon size={13} className="text-craft-muted shrink-0" />
              </button>
              <span className="h-3.5 w-px bg-craft-border" />
              <button
                type="button"
                onClick={openRenameModal}
                className="text-craft-primary hover:opacity-80 font-extrabold transition-opacity cursor-pointer"
              >
                별명 변경
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-craft-muted hover:text-craft-danger font-bold transition-colors cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthChoiceModal}
              className="flex items-center gap-2 rounded-[12px] bg-craft-surface border-[1.5px] border-craft-border-strong px-3.5 py-2 text-xs font-bold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
            >
              <UserIcon size={15} />
              <span>내 계정 · 별명</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── 정중앙 메인 컨텐츠 ─── */}
      <main className="flex flex-1 items-center justify-center px-6 py-6">
        <div className="flex w-full max-w-xl flex-col items-center gap-6">
          {/* 브랜드 타이틀 */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border-2 border-craft-border-strong shadow-[0_4px_0_var(--cb-border-strong)]">
              <img
                src="./icon-192.png"
                alt="Cozybridge 앱 아이콘"
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-craft-ink">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm font-semibold text-craft-muted">
              점을 잇고 튼튼한 다리를 만들어 트럭을 건너게 해보세요!
            </p>
          </div>

          {/* 1-1 히어로 풀폭 메인 시작 버튼 */}
          <button
            type="button"
            onClick={() => onNavigate('build', recommendedLevel.id)}
            className="group w-full rounded-[20px] bg-craft-primary hover:bg-craft-primary-hover p-5 sm:p-6 text-left text-white shadow-[0_4px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[15px] bg-white/20 text-white">
                  <PlayIcon size={24} />
                </div>
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-black/20 px-3 py-0.5 text-xs font-extrabold text-white/95">
                    {recommendedLevel.stepNumber}단계 · {recommendedLevel.title}
                  </span>
                  <div className="mt-1 text-xl font-extrabold leading-snug">
                    바로 다리 짓기 시작!
                  </div>
                </div>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 group-hover:translate-x-1 transition-transform">
                <ArrowRightIcon size={20} />
              </div>
            </div>
          </button>

          {/* 초등 3학년 눈높이 다리 교실 (수업 모드) 풀폭 배너 카드 */}
          <button
            type="button"
            onClick={() => onNavigate('lesson-select')}
            className="group w-full rounded-[20px] bg-craft-surface border-2 border-craft-sage/55 hover:border-craft-sage p-4 sm:p-5 text-left transition-all cursor-pointer overflow-hidden shadow-xs"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-craft-sage-soft text-craft-sage border border-craft-sage/30 group-hover:bg-craft-sage group-hover:text-white transition-colors">
                  <SchoolBookIcon size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full bg-craft-sage-soft px-2.5 py-0.5 text-xs font-extrabold text-craft-sage">
                      초보 추천 · {completedLessonCount}/{LESSONS.length}교시 완료
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-extrabold text-craft-ink group-hover:text-craft-sage transition-colors">
                    다리 교실 (수업 모드)
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-craft-muted truncate">
                    점 잇기부터 아래쪽 세모(▽) 받침대까지 쉽고 재밌게 배워요!
                  </p>
                </div>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-craft-sage-soft text-craft-sage group-hover:translate-x-1 transition-transform">
                <ArrowRightIcon size={18} />
              </div>
            </div>
          </button>

          {/* 1-1 하단 2×2 균등 메뉴 타일 */}
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3.5">
            {subTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                className="group flex flex-col justify-between rounded-[18px] bg-craft-surface border-[1.5px] border-craft-border hover:border-craft-primary p-5 text-left transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-craft-bg border border-craft-border text-craft-ink group-hover:bg-craft-primary group-hover:text-white group-hover:border-craft-primary transition-colors">
                    {tile.icon}
                  </div>
                  <ArrowRightIcon
                    size={16}
                    className="text-craft-muted group-hover:text-craft-primary group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </div>

                <div className="mt-3.5 min-w-0">
                  <div className="text-base font-extrabold text-craft-ink group-hover:text-craft-primary transition-colors">
                    {tile.label}
                  </div>
                  <p className="mt-1 text-xs font-medium text-craft-muted leading-relaxed">
                    {tile.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* 하단 안심 저장 안내 (내부 개발 용어 배제) */}
          <div className="flex items-center gap-2 text-xs font-semibold text-craft-muted">
            <span className="h-2 w-2 rounded-full bg-craft-sage" />
            <span>만든 다리는 내 계정별로 안전하게 따로 저장돼요</span>
          </div>
        </div>
      </main>

      {/* 통합 다리 보관함 · 광장 모달 (6-2) */}
      <BridgeHubModal
        isOpen={hubTab !== null}
        initialTab={hubTab ?? 'designs'}
        currentUserId={effectiveUserId}
        currentUserName={session?.displayName ?? '게스트 엔지니어'}
        onSelectDesign={onSelectDesign}
        onClose={() => setHubTab(null)}
      />

      {/* 시작 방법 선택 · 계정 · 내 별명 변경 모달 (7-3) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        currentSession={session}
        onLogout={() => void handleLogout()}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(newSession) => updateSession(newSession)}
      />
    </div>
  );
}
