import { useState, useEffect } from 'react';
import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import { LEVELS } from '@cozybridge/content';
import type { LevelItemView } from '@cozybridge/application';
import { LevelProgressUseCase } from '@cozybridge/application';
import { IndexedDbLevelProgressRepository } from '@cozybridge/infrastructure';
import { StageTerrainPreviewSvg } from '../components/ui/BridgePreviewSvg';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import {
  getUserDatabase,
  resolveEffectiveStorageScope,
} from '../utils/user-storage';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
  StarIcon,
} from '../components/ui/Icons';

interface StageSelectScreenProps {
  currentUserId?: string | null;
  onSelectLevel: (levelId: string) => void;
  onBack: () => void;
}

const STAGE_CHAPTER_TABS = [
  {
    id: 'all',
    label: '전체 22단계',
    subtitle: '쉬운 계곡부터 전설의 대교까지 차례대로 도전해요',
    minStep: 1,
    maxStep: 99,
  },
  {
    id: 'ch1',
    label: '1장 · 입문 계곡 (1~5)',
    subtitle: '첫 세모 다리, 연속 세모 개울, 디딤돌 기둥과 완만한 내리막!',
    minStep: 1,
    maxStep: 5,
  },
  {
    id: 'ch2',
    label: '2장 · 강물과 언덕 (6~11)',
    subtitle: '깊은 내리막 교각, 바위섬, 오르막 강, 5칸 막대 제한!',
    minStep: 6,
    maxStep: 11,
  },
  {
    id: 'ch3',
    label: '3장 · 절벽과 통나무 (12~17)',
    subtitle: '짧은 통나무 제한, 절벽 아치, 쌍둥이 교각과 계단 폭포!',
    minStep: 12,
    maxStep: 17,
  },
  {
    id: 'ch4',
    label: '4장 · 마스터 협곡 (18~22)',
    subtitle: '알뜰 예산 시험, 산악 철교, 구름 위 심연과 최종 대교!',
    minStep: 18,
    maxStep: 22,
  },
] as const;

function getChapterBadgeLabel(stepNumber: number): string {
  if (stepNumber <= 5) return '1장 · 입문 계곡';
  if (stepNumber <= 11) return '2장 · 강물과 언덕';
  if (stepNumber <= 17) return '3장 · 절벽과 통나무';
  return '4장 · 마스터 협곡';
}

/**
 * 섹션 2-3 스테이지 선택 화면 (22단계 4챕터 확장)
 * - Headless UI TabGroup 챕터 필터 + 좌측 번호표 리스트 + 우측 고정형(sticky) 대형 모눈 지형 프리뷰 카드
 */
export function StageSelectScreen({
  currentUserId,
  onSelectLevel,
  onBack,
}: StageSelectScreenProps) {
  const [levelItems, setLevelItems] = useState<LevelItemView[]>([]);
  const [selectedId, setSelectedId] = useState<string>('level-001');
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const activeScope = resolveEffectiveStorageScope(currentUserId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadLevels = async () => {
      try {
        const db = getUserDatabase(currentUserId);
        const repo = new IndexedDbLevelProgressRepository(db);
        const useCase = new LevelProgressUseCase(repo);
        const items = await useCase.getLevelListView();
        if (cancelled) return;
        setLevelItems(items);

        // 해금된 마지막(또는 미완료 첫) 단계를 기본 포커스로 선택
        const nextIncomplete = items.find(
          (it) => it.isUnlocked && !it.isCompleted,
        );
        if (nextIncomplete) {
          setSelectedId(nextIncomplete.level.id);
        } else if (items.length > 0) {
          setSelectedId(items[items.length - 1]!.level.id);
        }
      } catch (err) {
        console.error('단계 목록 불러오기 실패:', err);
        if (!cancelled) {
          const fallbackItems: LevelItemView[] = LEVELS.map((level, idx) => ({
            level,
            isUnlocked: idx === 0,
            isCompleted: false,
            bestCost: null,
            stars: 0,
          }));
          setLevelItems(fallbackItems);
          if (fallbackItems[0]) {
            setSelectedId(fallbackItems[0].level.id);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadLevels();
    return () => {
      cancelled = true;
    };
  }, [activeScope, currentUserId]);

  const totalStars = levelItems.reduce((sum, it) => sum + it.stars, 0);
  const maxStars = levelItems.length * 3;
  const completedCount = levelItems.filter((it) => it.isCompleted).length;

  const selectedIndex = Math.max(
    0,
    levelItems.findIndex((it) => it.level.id === selectedId),
  );
  const selectedItem = levelItems[selectedIndex];

  const handleTabChange = (nextTabIdx: number) => {
    setActiveTabIndex(nextTabIdx);
    const tab = STAGE_CHAPTER_TABS[nextTabIdx];
    if (!tab || tab.id === 'all' || levelItems.length === 0) return;

    const currentStep = selectedIndex + 1;
    if (currentStep < tab.minStep || currentStep > tab.maxStep) {
      const chapterSlice = levelItems.slice(tab.minStep - 1, tab.maxStep);
      const preferred =
        chapterSlice.find((it) => it.isUnlocked && !it.isCompleted) ??
        chapterSlice[0];
      if (preferred) {
        setSelectedId(preferred.level.id);
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-craft-bg text-craft-ink select-none overflow-hidden">
      {/* ─── 상단 헤더 ─── */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-[1.5px] border-craft-border bg-craft-surface px-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-[12px] bg-craft-bg border-[1.5px] border-craft-border-strong px-3.5 py-2 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
          >
            <ArrowLeftIcon size={15} />
            <span>처음으로</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-craft-ink truncate">
            단계별 도전
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {levelItems.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-craft-sage-soft border border-craft-sage/35 px-3.5 py-1.5 text-xs font-extrabold text-craft-sage">
              <CheckCircleIcon size={14} />
              <span>
                통과 {completedCount} / {levelItems.length}단계
              </span>
            </div>
          )}
          {maxStars > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-craft-amber-soft border border-craft-amber/30 px-3.5 py-1.5 text-xs font-extrabold text-craft-amber">
              <StarIcon size={15} filled />
              <span>
                모은 별 {totalStars} / {maxStars}
              </span>
            </div>
          )}
          <ThemeSwitcher />
        </div>
      </header>

      {/* ─── 본문: 챕터 탭 + 좌측 번호표 리스트 + 우측 대형 지형 단면 프리뷰 ─── */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm font-bold text-craft-muted">
              단계 지도를 펼치는 중이에요...
            </div>
          ) : (
            <TabGroup selectedIndex={activeTabIndex} onChange={handleTabChange}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabList className="flex flex-wrap gap-2">
                  {STAGE_CHAPTER_TABS.map((tab) => (
                    <Tab
                      key={tab.id}
                      className="rounded-full border-[1.5px] border-craft-border bg-craft-surface px-4 py-2 text-xs font-extrabold text-craft-muted transition-colors data-selected:border-craft-primary data-selected:bg-craft-primary data-selected:text-white hover:border-craft-border-strong focus:outline-none cursor-pointer"
                    >
                      {tab.label}
                    </Tab>
                  ))}
                </TabList>

                <span className="text-xs font-semibold text-craft-muted">
                  {STAGE_CHAPTER_TABS[activeTabIndex]?.subtitle}
                </span>
              </div>

              <TabPanels className="mt-5">
                {STAGE_CHAPTER_TABS.map((tab) => {
                  const filteredEntries = levelItems
                    .map((item, globalIdx) => ({
                      item,
                      stepNumber: globalIdx + 1,
                    }))
                    .filter(
                      ({ stepNumber }) =>
                        stepNumber >= tab.minStep && stepNumber <= tab.maxStep,
                    );

                  return (
                    <TabPanel
                      key={tab.id}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start focus:outline-none"
                    >
                      {/* 좌측: 단계 번호표 리스트 */}
                      <div className="lg:col-span-5 flex flex-col gap-3">
                        {filteredEntries.map(({ item, stepNumber }) => {
                          const isSelected =
                            item.level.id === selectedItem?.level.id;
                          const stepLabel = String(stepNumber).padStart(2, '0');
                          const maxLen = item.level.maxMemberLength ?? 6;

                          return (
                            <button
                              key={item.level.id}
                              type="button"
                              onClick={() => setSelectedId(item.level.id)}
                              className={`flex items-center justify-between gap-3.5 rounded-[18px] p-4 text-left border-[1.5px] transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                  ? 'bg-craft-surface border-craft-primary ring-2 ring-craft-primary/20 shadow-sm'
                                  : 'bg-craft-surface/85 border-craft-border hover:border-craft-border-strong'
                              } ${!item.isUnlocked ? 'opacity-75' : ''}`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-sm font-extrabold ${
                                    isSelected
                                      ? 'bg-craft-primary text-white'
                                      : item.isUnlocked
                                        ? 'bg-craft-bg border border-craft-border text-craft-ink'
                                        : 'bg-craft-subtle text-craft-muted'
                                  }`}
                                >
                                  {stepLabel}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-sm sm:text-base font-extrabold text-craft-ink truncate">
                                    {item.level.title}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-craft-muted">
                                    <span>
                                      ₩{item.level.budget.toLocaleString()}
                                    </span>
                                    {maxLen < 6 && (
                                      <span className="rounded-md bg-craft-amber-soft px-1.5 py-0.5 text-[11px] font-extrabold text-craft-amber">
                                        최대 {maxLen}칸
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {!item.isUnlocked ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-craft-subtle px-3 py-1 text-xs font-bold text-craft-muted">
                                    <LockIcon size={13} />
                                    <span>잠김</span>
                                  </span>
                                ) : item.isCompleted ? (
                                  <div className="flex items-center gap-0.5 rounded-full bg-craft-amber-soft border border-craft-amber/30 px-2.5 py-1">
                                    {[1, 2, 3].map((s) => (
                                      <StarIcon
                                        key={s}
                                        size={14}
                                        filled={s <= item.stars}
                                        className={
                                          s <= item.stars
                                            ? 'text-craft-amber'
                                            : 'text-craft-border-strong'
                                        }
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="inline-block rounded-full bg-craft-sage-soft border border-craft-sage/30 px-3 py-1 text-xs font-extrabold text-craft-sage">
                                    도전 가능
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* 우측: 선택한 단계 대형 지형 프리뷰 & 시작 카드 (스크롤 시에도 상단 고정) */}
                      {selectedItem && (
                        <div className="lg:col-span-7 lg:sticky lg:top-0 rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-sm overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-craft-primary px-3 py-1 text-xs font-extrabold text-white">
                                {selectedIndex + 1}단계
                              </span>
                              <span className="rounded-full bg-craft-subtle px-3 py-1 text-xs font-extrabold text-craft-ink">
                                {getChapterBadgeLabel(selectedIndex + 1)}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-craft-muted">
                              난이도 {'★'.repeat(selectedItem.level.difficulty)}
                              {'☆'.repeat(
                                Math.max(0, 5 - selectedItem.level.difficulty),
                              )}{' '}
                              · 막대 최대{' '}
                              {selectedItem.level.maxMemberLength ?? 6}칸
                            </span>
                          </div>

                          <h2 className="text-2xl font-extrabold text-craft-ink">
                            {selectedItem.level.title}
                          </h2>
                          <p className="mt-1.5 text-sm text-craft-muted leading-relaxed">
                            {selectedItem.level.description}
                          </p>

                          {/* 모눈 지형 단면 프리뷰 SVG */}
                          <StageTerrainPreviewSvg
                            level={selectedItem.level}
                            className="mt-4 h-52 sm:h-60 w-full"
                          />

                          {/* 예산 & 최고 기록 2열 요약 */}
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-[14px] bg-craft-bg border border-craft-border p-4">
                              <span className="block text-xs font-bold text-craft-muted">
                                쓸 수 있는 돈
                              </span>
                              <span className="mt-1 block text-lg font-extrabold text-craft-ink">
                                ₩{selectedItem.level.budget.toLocaleString()}
                              </span>
                            </div>

                            <div className="rounded-[14px] bg-craft-bg border border-craft-border p-4">
                              <span className="block text-xs font-bold text-craft-muted">
                                내 최고 절약 기록
                              </span>
                              <span
                                className={`mt-1 block text-lg font-extrabold ${
                                  selectedItem.bestCost !== null
                                    ? 'text-craft-sage'
                                    : 'text-craft-muted'
                                }`}
                              >
                                {selectedItem.bestCost !== null
                                  ? `₩${Math.round(selectedItem.bestCost).toLocaleString()}`
                                  : '아직 없음'}
                              </span>
                            </div>
                          </div>

                          {/* 시작 버튼 */}
                          <div className="mt-5">
                            {selectedItem.isUnlocked ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectLevel(selectedItem.level.id)
                                }
                                className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-craft-primary hover:bg-craft-primary-hover px-6 py-4 text-base font-extrabold text-white shadow-[0_4px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer"
                              >
                                <span>이 단계 다리 짓기</span>
                                <ArrowRightIcon size={18} />
                              </button>
                            ) : (
                              <div className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-craft-subtle border border-craft-border px-6 py-4 text-sm font-bold text-craft-muted">
                                <LockIcon size={16} />
                                <span>앞 단계를 먼저 통과하면 열려요!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabPanel>
                  );
                })}
              </TabPanels>
            </TabGroup>
          )}
        </div>
      </main>
    </div>
  );
}
