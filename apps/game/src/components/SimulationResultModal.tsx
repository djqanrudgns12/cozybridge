import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { FailureReport } from '@cozybridge/domain';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BulbIcon,
  CheckCircleIcon,
  CloseIcon,
  SchoolBookIcon,
  StarIcon,
} from './ui/Icons';

interface SimulationResultModalProps {
  isOpen: boolean;
  status: 'success' | 'failure' | null;
  failureReport: FailureReport | null;
  buildCost: number;
  budget: number;
  memberCount?: number;
  lessonSummaryText?: string;
  nextActionLabel?: string;
  recommendedLessonLabel?: string;
  onRetry: () => void;
  onOpenHint?: () => void;
  onOpenLesson?: () => void;
  onNextLevel?: () => void;
  onClose: () => void;
}

interface FriendlyFailureGuide {
  kind: 'sag' | 'snap' | 'gap' | 'wobble' | 'blocked';
  title: string;
  whyText: string;
  howText: string;
}

const FAILURE_GUIDES: Record<string, FriendlyFailureGuide> = {
  'failure.road_blocked': {
    kind: 'blocked',
    title: '길 위에 막대가 가로막고 있어요!',
    whyText: '트럭은 유령 자동차가 아니라서 길 위쪽에 막대가 서 있으면 쿵 부딪혀요.',
    howText: '지우개로 길 위 막대를 모두 지워 길을 비우고, 받침대는 항상 길 아래쪽(▽)에만 달아주세요!',
  },
  'failure.excessive_displacement': {
    kind: 'sag',
    title: '다리 가운데가 아래로 휘었어요!',
    whyText: '일자 길만 놓으면 트럭 무게 때문에 가운데가 출렁거리며 내려앉아요.',
    howText: '길 아래쪽에 뒤집어진 세모(▽) 모양으로 받침대 막대를 덧대어 잡아 주세요.',
  },
  'failure.member_deformation': {
    kind: 'snap',
    title: '막대 하나가 너무 무거워서 끊어졌어요!',
    whyText: '한쪽 막대에만 트럭 무게가 몰려서 빨갛게 변하다가 톡 끊어졌어요.',
    howText: '길 아래쪽에 세모(▽) 받침대를 여러 개 나누어 연결해 무게를 나눠 보세요.',
  },
  'failure.vehicle_fall': {
    kind: 'gap',
    title: '길이 끊겨 있어서 트럭이 떨어졌어요!',
    whyText: '트럭이 달리는 바닥 길이 끝까지 반듯하게 이어지지 않았어요.',
    howText: '왼쪽 노란 고정 핀부터 오른쪽 고정 핀까지 빈틈없이 길을 이어 주세요.',
  },
  'failure.support_failure': {
    kind: 'snap',
    title: '양쪽 끝 고정 핀 주변이 무너졌어요!',
    whyText: '다리 전체 무게를 양끝 막대 하나만 버티느라 힘이 모자랐어요.',
    howText: '양쪽 노란 고정 핀에서 길 아래쪽으로 세모(▽) 받침대 팔을 뻗어 보세요.',
  },
  'failure.simulation_instability': {
    kind: 'wobble',
    title: '다리가 옆으로 흔들리다 무너졌어요!',
    whyText: '네모 모양으로만 연결하면 옆으로 스르륵 기울어지기 쉬워요.',
    howText: '길 아래 네모 칸 안에 대각선 막대 하나만 더 그어 세모 모양으로 잠가 보세요!',
  },
};

const DEFAULT_FAILURE: FriendlyFailureGuide = {
  kind: 'sag',
  title: '다리가 트럭 무게를 버티지 못했어요!',
  whyText: '트럭이 지나갈 때 다리 가운데가 흔들리며 아래로 내려앉았어요.',
  howText: '길 아래쪽에 뒤집어진 세모(▽) 모양으로 대각선 받침대를 달면 훨씬 단단해져요.',
};

function CauseDiagramSvg({ kind }: { kind: FriendlyFailureGuide['kind'] }) {
  if (kind === 'blocked') {
    return (
      <svg viewBox="0 0 180 76" className="w-full h-20 block">
        <line x1="18" y1="54" x2="162" y2="54" stroke="var(--cb-ink)" strokeWidth="4" strokeLinecap="round" />
        <polygon points="82,54 106,20 130,54" fill="none" stroke="var(--cb-danger)" strokeWidth="3.8" strokeLinejoin="round" />
        <rect x="34" y="36" width="34" height="13" rx="3" fill="var(--cb-primary)" />
        <circle cx="43" cy="51" r="4" fill="var(--cb-ink)" />
        <circle cx="60" cy="51" r="4" fill="var(--cb-ink)" />
        <path d="M73 34 L81 42 M81 34 L73 42" stroke="var(--cb-danger)" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="18" cy="54" r="5" fill="var(--cb-amber)" />
        <circle cx="162" cy="54" r="5" fill="var(--cb-amber)" />
      </svg>
    );
  }
  if (kind === 'gap') {
    return (
      <svg viewBox="0 0 180 76" className="w-full h-20 block">
        <line x1="18" y1="36" x2="72" y2="36" stroke="var(--cb-danger)" strokeWidth="4" strokeLinecap="round" />
        <line x1="114" y1="36" x2="162" y2="36" stroke="var(--cb-danger)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="18" cy="36" r="5" fill="var(--cb-amber)" />
        <circle cx="162" cy="36" r="5" fill="var(--cb-amber)" />
        <path d="M84 26 Q98 44 96 64" fill="none" stroke="var(--cb-danger)" strokeWidth="2.5" strokeDasharray="4 3" />
      </svg>
    );
  }
  if (kind === 'snap') {
    return (
      <svg viewBox="0 0 180 76" className="w-full h-20 block">
        <line x1="20" y1="38" x2="76" y2="48" stroke="var(--cb-danger)" strokeWidth="4.2" strokeLinecap="round" />
        <line x1="104" y1="48" x2="160" y2="38" stroke="var(--cb-danger)" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M84 36 L94 54 M96 36 L86 54" stroke="var(--cb-danger)" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="20" cy="38" r="5" fill="var(--cb-amber)" />
        <circle cx="160" cy="38" r="5" fill="var(--cb-amber)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 180 76" className="w-full h-20 block">
      <path d="M20 30 Q90 68 160 30" fill="none" stroke="var(--cb-danger)" strokeWidth="4" strokeDasharray="6 4" strokeLinecap="round" />
      <path d="M90 22 L90 48 M83 41 L90 49 L97 41" fill="none" stroke="var(--cb-danger)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="30" r="5" fill="var(--cb-amber)" />
      <circle cx="160" cy="30" r="5" fill="var(--cb-amber)" />
    </svg>
  );
}

function SolutionDiagramSvg() {
  return (
    <svg viewBox="0 0 180 76" className="w-full h-20 block">
      <rect x="74" y="8" width="32" height="10" rx="2.5" fill="var(--cb-sage)" opacity="0.85" />
      <line x1="22" y1="24" x2="158" y2="24" stroke="var(--cb-sage)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="22,24 67,58 90,24" fill="none" stroke="var(--cb-sage)" strokeWidth="3.3" strokeLinejoin="round" />
      <polygon points="90,24 113,58 158,24" fill="none" stroke="var(--cb-sage)" strokeWidth="3.3" strokeLinejoin="round" />
      <line x1="67" y1="58" x2="113" y2="58" stroke="var(--cb-sage)" strokeWidth="3.3" strokeLinecap="round" />
      <circle cx="22" cy="24" r="5" fill="var(--cb-amber)" />
      <circle cx="90" cy="24" r="4" fill="var(--cb-sage)" />
      <circle cx="67" cy="58" r="4" fill="var(--cb-sage)" />
      <circle cx="113" cy="58" r="4" fill="var(--cb-sage)" />
      <circle cx="158" cy="24" r="5" fill="var(--cb-amber)" />
    </svg>
  );
}

function computeEarnedStars(cost: number, budget: number): number {
  if (!Number.isFinite(budget) || budget <= 0) return 3;
  const ratio = cost / budget;
  if (ratio <= 0.65) return 3;
  if (ratio <= 0.85) return 2;
  return 1;
}

/**
 * 섹션 5-3 원인 ↔ 해결법 / 성취 기록 좌·우 2단 코칭 카드 모달 (Headless UI Dialog)
 */
export function SimulationResultModal({
  isOpen,
  status,
  failureReport,
  buildCost,
  budget,
  memberCount,
  lessonSummaryText,
  nextActionLabel,
  recommendedLessonLabel,
  onRetry,
  onOpenHint,
  onOpenLesson,
  onNextLevel,
  onClose,
}: SimulationResultModalProps) {
  if (!status) return null;

  const isSuccess = status === 'success';
  const isUnlimited = !Number.isFinite(budget);
  const remainingBudget = isUnlimited ? Infinity : budget - buildCost;
  const earnedStars = computeEarnedStars(buildCost, budget);
  const usagePercent = isUnlimited
    ? 45
    : Math.min(100, Math.round((buildCost / Math.max(budget, 1)) * 100));

  const guide = failureReport
    ? FAILURE_GUIDES[failureReport.playerFacingMessageKey] ?? DEFAULT_FAILURE
    : DEFAULT_FAILURE;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity"
        style={{ backgroundColor: 'var(--cb-backdrop)' }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="relative w-full max-w-xl rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-2xl text-craft-ink overflow-hidden">
          {/* 우상단 닫기 */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-[10px] text-craft-muted hover:bg-craft-subtle hover:text-craft-ink transition-colors cursor-pointer"
            title="닫기"
          >
            <CloseIcon size={18} />
          </button>

          {/* 상단 타이틀 & 배지 */}
          <div className="flex flex-col items-center text-center px-6">
            {isSuccess ? (
              <>
                <div className="mb-3 flex items-center gap-2 rounded-full bg-craft-amber-soft border border-craft-amber/30 px-4 py-1.5 text-craft-amber">
                  {[1, 2, 3].map((idx) => (
                    <StarIcon
                      key={idx}
                      size={22}
                      filled={idx <= earnedStars}
                      className={
                        idx <= earnedStars
                          ? 'text-craft-amber'
                          : 'text-craft-border-strong'
                      }
                    />
                  ))}
                </div>
                <DialogTitle className="text-xl font-extrabold text-craft-ink">
                  야호! 트럭이 무사히 건넜어요!
                </DialogTitle>
                <p className="mt-1.5 text-sm text-craft-muted leading-relaxed">
                  {lessonSummaryText ??
                    '내가 만든 튼튼한 다리 덕분에 목적지까지 안전하게 도착했어요.'}
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-craft-danger-soft text-craft-danger border border-craft-danger/30">
                  <AlertTriangleIcon size={24} />
                </div>
                <DialogTitle className="text-xl font-extrabold text-craft-ink">
                  {guide.title}
                </DialogTitle>
                <p className="mt-1.5 text-sm text-craft-muted">
                  괜찮아요! 아래 그림을 보고 조금만 고치면 금방 성공할 수 있어요.
                </p>
              </>
            )}
          </div>

          {/* 중앙 좌·우 2단 카드 */}
          {isSuccess ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 좌측: 이번 다리 기록 */}
              <div className="rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border p-5 flex flex-col justify-between">
                <div>
                  <span className="inline-block rounded-full bg-craft-surface border border-craft-border px-2.5 py-0.5 text-xs font-extrabold text-craft-muted">
                    이번 다리 기록
                  </span>
                  <div className="mt-3 text-2xl font-extrabold text-craft-ink">
                    ₩{Math.round(buildCost).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-craft-muted">
                    {typeof memberCount === 'number'
                      ? `사용한 막대 ${memberCount}개`
                      : '다리 건설 비용'}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-craft-muted mb-1.5">
                    <span>예산 사용량</span>
                    <span className="font-bold text-craft-ink">
                      {isUnlimited ? '자유 모드' : `${usagePercent}%`}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-craft-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-craft-sage transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 우측: 절약 성취도 */}
              <div className="rounded-[16px] bg-craft-sage-soft/55 border-[1.5px] border-craft-sage/35 p-5 flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-craft-surface border border-craft-sage/30 px-2.5 py-0.5 text-xs font-extrabold text-craft-sage">
                    <CheckCircleIcon size={13} />
                    <span>절약 성취도</span>
                  </span>
                  <div className="mt-3 text-2xl font-extrabold text-craft-sage">
                    {isUnlimited
                      ? '무제한 통과!'
                      : `+₩${Math.max(0, Math.round(remainingBudget)).toLocaleString()} 아낌`}
                  </div>
                </div>

                <p className="mt-4 text-xs font-semibold text-craft-ink leading-relaxed">
                  {earnedStars === 3
                    ? '최고예요! 적은 돈으로 아주 튼튼한 다리를 완성했어요.'
                    : earnedStars === 2
                    ? '멋진 다리예요! 막대를 조금만 줄이면 별 3개도 가능해요.'
                    : '무사히 통과했어요! 다음에는 길 아래 세모(▽)로 비용을 더 아껴 볼까요?'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 좌측: 왜 무너졌을까요? */}
              <div className="rounded-[16px] bg-craft-danger-soft/45 border-[1.5px] border-craft-danger/30 p-4 flex flex-col justify-between">
                <div>
                  <span className="inline-block rounded-full bg-craft-surface border border-craft-danger/30 px-2.5 py-0.5 text-xs font-extrabold text-craft-danger">
                    왜 무너졌을까요?
                  </span>
                  <div className="my-2 rounded-[12px] bg-craft-paper border border-craft-border p-2">
                    <CauseDiagramSvg kind={guide.kind} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-craft-ink leading-relaxed">
                  {guide.whyText}
                </p>
              </div>

              {/* 우측: 이렇게 고쳐보세요! */}
              <div className="rounded-[16px] bg-craft-sage-soft/55 border-[1.5px] border-craft-sage/35 p-4 flex flex-col justify-between">
                <div>
                  <span className="inline-block rounded-full bg-craft-surface border border-craft-sage/30 px-2.5 py-0.5 text-xs font-extrabold text-craft-sage">
                    이렇게 해보세요!
                  </span>
                  <div className="my-2 rounded-[12px] bg-craft-paper border border-craft-border p-2">
                    <SolutionDiagramSvg />
                  </div>
                </div>
                <p className="text-xs font-semibold text-craft-ink leading-relaxed">
                  {guide.howText}
                </p>
              </div>
            </div>
          )}

          {/* 스테이지 실패 시 원클릭 다리 교실 복습 배너 */}
          {!isSuccess && onOpenLesson && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLesson();
              }}
              className="mt-4 w-full flex items-center justify-between gap-3 rounded-[14px] bg-craft-amber-soft/75 border-[1.5px] border-craft-amber/40 px-4 py-3 text-left hover:bg-craft-amber-soft transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <SchoolBookIcon size={18} className="text-craft-amber shrink-0" />
                <span className="text-xs font-extrabold text-craft-ink truncate">
                  {recommendedLessonLabel ??
                    '어렵다면? 다리 교실에서 이 원리 1분 연습하기'}
                </span>
              </div>
              <ArrowRightIcon size={15} className="text-craft-amber shrink-0" />
            </button>
          )}

          {/* 하단 액션 버튼 */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!isSuccess && onOpenHint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHint();
                }}
                className="flex items-center justify-center gap-1.5 rounded-[14px] bg-craft-bg border-[1.5px] border-craft-border-strong px-4 py-3 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
              >
                <BulbIcon size={16} className="text-craft-amber" />
                <span>비법 노트 열기</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRetry}
              className={`flex-1 rounded-[14px] px-5 py-3 text-sm font-extrabold transition-all cursor-pointer ${
                isSuccess
                  ? 'bg-craft-bg border-[1.5px] border-craft-border-strong text-craft-ink hover:bg-craft-subtle'
                  : 'bg-craft-primary hover:bg-craft-primary-hover text-white shadow-[0_3px_0_var(--cb-primary-shadow)] active:translate-y-0.5'
              }`}
            >
              {isSuccess ? '내 다리 다시 보기' : '바로 고치러 가기'}
            </button>

            {isSuccess && onNextLevel && (
              <button
                type="button"
                onClick={onNextLevel}
                className="flex-1 flex items-center justify-center gap-2 rounded-[14px] bg-craft-sage hover:opacity-95 px-5 py-3 text-sm font-extrabold text-white shadow-[0_3px_0_rgba(0,0,0,0.18)] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <span>{nextActionLabel ?? '다음 단계로 출발!'}</span>
                <ArrowRightIcon size={16} />
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
