import { useState, useMemo } from 'react';
import {
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import { LESSONS, type LessonDefinition } from '@cozybridge/content';
import { getCompletedLessonIds } from '../utils/lesson-progress';
import { resolveEffectiveStorageScope } from '../utils/user-storage';
import { StageTerrainPreviewSvg } from '../components/ui/BridgePreviewSvg';
import { ThemeSwitcher } from '../components/ui/ThemeSwitcher';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SchoolBookIcon,
} from '../components/ui/Icons';

interface LessonSelectScreenProps {
  currentUserId?: string | null;
  onSelectLesson: (lessonId: string) => void;
  onStartStages: () => void;
  onBack: () => void;
}

const LESSON_FILTER_TABS = [
  { id: 'all', label: '전체 8교시', orders: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: 'basic', label: '기초 걸음마 (1~3교시)', orders: [1, 2, 3] },
  { id: 'truss', label: '튼튼 세모 비법 (4~8교시)', orders: [4, 5, 6, 7, 8] },
] as const;

/**
 * 초등 3학년 눈높이 다리 교실(수업 모드) 시간표 선택 화면
 * - 어떤 교시든 잠금 없이 바로 눌러 배울 수 있고, 우측에서 학습 목표와 지형을 한눈에 확인합니다.
 */
export function LessonSelectScreen({
  currentUserId,
  onSelectLesson,
  onStartStages,
  onBack,
}: LessonSelectScreenProps) {
  const activeScope = resolveEffectiveStorageScope(currentUserId);
  const completedIds = useMemo(
    () => getCompletedLessonIds(currentUserId),
    [activeScope, currentUserId],
  );

  const initialLessonId = useMemo(() => {
    const firstIncomplete = LESSONS.find((l) => !completedIds.has(l.id));
    return firstIncomplete?.id ?? LESSONS[0]?.id ?? 'lesson-001';
  }, [completedIds]);

  const [selectedId, setSelectedId] = useState<string>(initialLessonId);

  const selectedLesson: LessonDefinition =
    LESSONS.find((l) => l.id === selectedId) ?? LESSONS[0]!;

  const completedCount = LESSONS.filter((l) => completedIds.has(l.id)).length;

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
          <div className="flex items-center gap-2 min-w-0">
            <SchoolBookIcon size={20} className="text-craft-primary shrink-0" />
            <h1 className="text-lg font-extrabold tracking-tight text-craft-ink truncate">
              다리 교실 · 차근차근 수업 모드
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-craft-sage-soft border border-craft-sage/35 px-3.5 py-1.5 text-xs font-extrabold text-craft-sage">
            <CheckCircleIcon size={15} />
            <span>
              완료 {completedCount} / {LESSONS.length}교시
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      {/* ─── 본문 ─── */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl flex flex-col gap-5">
          {/* 상단 친절 안내 배너 */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-craft-surface border-[1.5px] border-craft-border p-4 sm:px-5">
            <div>
              <div className="text-sm font-extrabold text-craft-ink">
                어려운 말 없이 직접 눌러보며 배우는 8단계 다리 수업이에요!
              </div>
              <p className="mt-0.5 text-xs font-semibold text-craft-muted">
                1교시부터 차례대로 해도 좋고, 궁금한 교시를 바로 골라서 연습해도 좋아요.
              </p>
            </div>
            {completedCount === LESSONS.length && (
              <button
                type="button"
                onClick={onStartStages}
                className="flex items-center gap-1.5 rounded-[12px] bg-craft-sage px-4 py-2.5 text-xs font-extrabold text-white hover:opacity-95 transition-opacity cursor-pointer"
              >
                <span>졸업 완료! 단계별 도전 가기</span>
                <ArrowRightIcon size={14} />
              </button>
            )}
          </div>

          {/* Headless UI TabGroup 과정 필터 + 좌·우 마스터-디테일 */}
          <TabGroup>
            <TabList className="flex flex-wrap gap-2">
              {LESSON_FILTER_TABS.map((tab) => (
                <Tab
                  key={tab.id}
                  className="rounded-full border-[1.5px] border-craft-border bg-craft-surface px-4 py-2 text-xs font-extrabold text-craft-muted transition-colors data-selected:border-craft-primary data-selected:bg-craft-primary data-selected:text-white hover:border-craft-border-strong focus:outline-none cursor-pointer"
                >
                  {tab.label}
                </Tab>
              ))}
            </TabList>

            <TabPanels className="mt-4">
              {LESSON_FILTER_TABS.map((tab) => {
                const filteredLessons = LESSONS.filter((l) =>
                  (tab.orders as readonly number[]).includes(l.order),
                );

                return (
                  <TabPanel
                    key={tab.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start focus:outline-none"
                  >
                    {/* 좌측: 교시 카드 리스트 */}
                    <div className="lg:col-span-5 flex flex-col gap-2.5">
                      {filteredLessons.map((lesson) => {
                        const isSelected = lesson.id === selectedLesson.id;
                        const isDone = completedIds.has(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => setSelectedId(lesson.id)}
                            className={`flex items-center justify-between gap-3 rounded-[16px] p-4 text-left border-[1.5px] transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-craft-surface border-craft-primary ring-2 ring-craft-primary/20 shadow-sm'
                                : 'bg-craft-surface/85 border-craft-border hover:border-craft-border-strong'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-xs font-extrabold ${
                                  isSelected
                                    ? 'bg-craft-primary text-white'
                                    : isDone
                                    ? 'bg-craft-sage-soft text-craft-sage border border-craft-sage/30'
                                    : 'bg-craft-bg border border-craft-border text-craft-ink'
                                }`}
                              >
                                {lesson.order}교시
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-craft-ink truncate">
                                  {lesson.title}
                                </div>
                                <div className="mt-0.5 text-xs font-medium text-craft-muted truncate">
                                  {lesson.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-craft-sage-soft border border-craft-sage/35 px-2.5 py-1 text-xs font-extrabold text-craft-sage">
                                  <CheckCircleIcon size={13} />
                                  <span>완료</span>
                                </span>
                              ) : (
                                <span className="inline-block rounded-full bg-craft-amber-soft border border-craft-amber/35 px-2.5 py-1 text-xs font-extrabold text-craft-amber">
                                  배워보기
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 우측: 선택한 교시 상세 미리보기 & 수업 시작 카드 */}
                    <div className="lg:col-span-7 rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-sm overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="rounded-full bg-craft-primary px-3 py-1 text-xs font-extrabold text-white">
                          {selectedLesson.badge}
                        </span>
                        <span className="text-xs font-bold text-craft-muted">
                          추천 도구:{' '}
                          {selectedLesson.recommendedTool === 'delete'
                            ? '지우개'
                            : '막대 잇기'}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-extrabold text-craft-ink">
                        {selectedLesson.title}
                      </h2>
                      <p className="mt-1.5 text-sm font-semibold text-craft-muted leading-relaxed">
                        {selectedLesson.subtitle}
                      </p>

                      {/* 모눈 지형 프리뷰 */}
                      <StageTerrainPreviewSvg
                        level={selectedLesson.level}
                        className="mt-4 h-44 sm:h-52 w-full"
                      />

                      {/* 이번 시간 핵심 포인트 박스 */}
                      <div className="mt-4 rounded-[15px] bg-craft-bg border border-craft-border p-4">
                        <span className="block text-xs font-extrabold text-craft-primary">
                          이번 교시 선생님 안내
                        </span>
                        <p className="mt-1.5 text-xs sm:text-sm font-semibold text-craft-ink leading-relaxed">
                          {selectedLesson.coachIntro}
                        </p>
                      </div>

                      {/* 수업 시작 버튼 */}
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => onSelectLesson(selectedLesson.id)}
                          className="w-full flex items-center justify-center gap-2 rounded-[16px] bg-craft-primary hover:bg-craft-primary-hover px-6 py-4 text-base font-extrabold text-white shadow-[0_4px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          <span>
                            {completedIds.has(selectedLesson.id)
                              ? `${selectedLesson.order}교시 다시 연습하기`
                              : `${selectedLesson.order}교시 수업 시작하기!`}
                          </span>
                          <ArrowRightIcon size={18} />
                        </button>
                      </div>
                    </div>
                  </TabPanel>
                );
              })}
            </TabPanels>
          </TabGroup>
        </div>
      </main>
    </div>
  );
}
