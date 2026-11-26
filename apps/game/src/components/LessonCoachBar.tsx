import { Switch } from '@headlessui/react';
import type { LessonDefinition } from '@cozybridge/content';
import {
  CheckCircleIcon,
  MagicWandIcon,
  SchoolBookIcon,
  UndoIcon,
} from './ui/Icons';

export type LessonCoachPhase = 'intro' | 'failed' | 'ready' | 'succeeded';

interface LessonCoachBarProps {
  lesson: LessonDefinition;
  phase: LessonCoachPhase;
  remainingStepCount: number;
  showGuide: boolean;
  isSimulating: boolean;
  onToggleGuide: (next: boolean) => void;
  onAutoCompleteExample: () => void;
  onResetLesson: () => void;
}

/**
 * 초등 3학년 눈높이 다리 교실 상단 코칭 카드 (Tailwind CSS + Headless UI Switch)
 */
export function LessonCoachBar({
  lesson,
  phase,
  remainingStepCount,
  showGuide,
  isSimulating,
  onToggleGuide,
  onAutoCompleteExample,
  onResetLesson,
}: LessonCoachBarProps) {
  const coachMessage =
    phase === 'succeeded'
      ? lesson.coachOnSuccess
      : phase === 'ready'
      ? lesson.coachWhenReady
      : phase === 'failed'
      ? lesson.coachOnFail
      : lesson.coachIntro;

  const isReadyOrDone = phase === 'ready' || phase === 'succeeded';

  return (
    <div className="pointer-events-auto mx-4 mt-3.5 rounded-[18px] bg-craft-surface/96 backdrop-blur-[3px] border-[1.5px] border-craft-border-strong p-4 shadow-md text-craft-ink">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* 좌측: 교시 배지 + 선생님 말풍선 */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border ${
              isReadyOrDone
                ? 'bg-craft-sage-soft text-craft-sage border-craft-sage/35'
                : phase === 'failed'
                ? 'bg-craft-amber-soft text-craft-amber border-craft-amber/40'
                : 'bg-craft-primary/12 text-craft-primary border-craft-primary/30'
            }`}
          >
            {isReadyOrDone ? (
              <CheckCircleIcon size={20} />
            ) : (
              <SchoolBookIcon size={19} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-craft-primary px-2.5 py-0.5 text-xs font-extrabold text-white">
                {lesson.badge}
              </span>
              <span className="text-sm font-extrabold text-craft-ink">
                {lesson.title}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                  remainingStepCount === 0
                    ? 'bg-craft-sage-soft text-craft-sage border-craft-sage/30'
                    : 'bg-craft-bg text-craft-muted border-craft-border'
                }`}
              >
                {remainingStepCount === 0
                  ? '출발 준비 완료!'
                  : `남은 점선 ${remainingStepCount}개`}
              </span>
            </div>

            <p className="mt-1.5 text-xs sm:text-sm font-bold text-craft-ink leading-relaxed">
              {coachMessage}
            </p>
          </div>
        </div>

        {/* 우측: 점선 힌트 스위치 + 막혔을 때 예시 자동 완성 & 처음 상태로 */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-[12px] bg-craft-bg border border-craft-border px-3 py-1.5">
            <span className="text-xs font-extrabold text-craft-muted">
              점선 힌트
            </span>
            <Switch
              checked={showGuide}
              onChange={onToggleGuide}
              disabled={isSimulating}
              aria-label="점선 힌트 켜기 및 끄기"
              className="group inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-craft-border-strong transition-colors data-checked:bg-craft-primary disabled:opacity-45 cursor-pointer"
            >
              <span className="size-3.5 translate-x-1 rounded-full bg-white transition-transform group-data-checked:translate-x-4.5" />
            </Switch>
          </div>

          {remainingStepCount > 0 && (
            <button
              type="button"
              disabled={isSimulating}
              onClick={onAutoCompleteExample}
              className="flex items-center gap-1.5 rounded-[12px] bg-craft-amber-soft border border-craft-amber/40 px-3 py-1.5 text-xs font-extrabold text-craft-ink hover:opacity-90 disabled:opacity-45 transition-opacity cursor-pointer"
              title="어려울 때 예시 다리 모양을 자동으로 그려줘요"
            >
              <MagicWandIcon size={14} className="text-craft-amber" />
              <span>예시 모양 보기</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSimulating}
            onClick={onResetLesson}
            className="flex items-center gap-1 rounded-[12px] bg-craft-bg border border-craft-border-strong px-3 py-1.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-45 transition-colors cursor-pointer"
            title="이번 교시 처음 상태로 되돌리기"
          >
            <UndoIcon size={14} />
            <span>처음 상태로</span>
          </button>
        </div>
      </div>
    </div>
  );
}
