import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { getHintsByLevelId } from '@cozybridge/content';
import type { LevelHint } from '@cozybridge/domain';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BulbIcon,
  CloseIcon,
} from './ui/Icons';

interface HintModalProps {
  isOpen: boolean;
  levelId: string;
  onClose: () => void;
}

const SANDBOX_FALLBACK_HINTS: LevelHint[] = [
  {
    id: 'sandbox-tip-1',
    levelId: 'sandbox-default',
    order: 1,
    title: '양쪽 고정 핀을 반듯하게 이어보세요',
    description:
      '노란색 고정 핀에서 시작해 반대편 고정 핀까지 길을 먼저 연결하면 트럭이 달릴 바닥이 완성돼요.',
    cost: 0,
  },
  {
    id: 'sandbox-tip-2',
    levelId: 'sandbox-default',
    order: 2,
    title: '길 아래에 세모(▽) 받침대를 달면 끄떡없어요!',
    description:
      '길 위는 트럭이 지나가도록 깨끗이 비워두고, 길 아래쪽에 뒤집어진 세모(▽) 모양으로 막대를 묶어 주면 무거운 트럭도 거뜬히 버텨내요.',
    cost: 0,
  },
];

/**
 * 비법 종류별 큰 도형 일러스트 (초등학생도 글 없이 직관적으로 원리 이해)
 */
function HintIllustrationSvg({ hintId, order }: { hintId: string; order: number }) {
  // 1) 바닥/수중 바위섬·교각 기둥 일러스트 (레벨 3, 4, 8, 10, 12)
  if (
    hintId.includes('lvl3-1') ||
    hintId.includes('lvl4-') ||
    hintId.includes('lvl8-') ||
    hintId.includes('lvl10-2') ||
    hintId.includes('lvl12-1')
  ) {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-32 block">
        <rect x="8" y="42" width="52" height="68" rx="4" fill="var(--cb-subtle)" />
        <rect x="260" y="48" width="52" height="62" rx="4" fill="var(--cb-subtle)" />
        <rect x="136" y="78" width="48" height="32" rx="4" fill="var(--cb-subtle)" />
        <line x1="60" y1="44" x2="260" y2="50" stroke="var(--cb-ink)" strokeWidth="4" strokeLinecap="round" />
        {/* 중앙 바위섬/바닥 지지 기둥 강조 */}
        <line x1="160" y1="78" x2="160" y2="47" stroke="var(--cb-sage)" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="160" y1="78" x2="110" y2="45" stroke="var(--cb-sage)" strokeWidth="3.2" strokeDasharray="5 4" />
        <line x1="160" y1="78" x2="210" y2="49" stroke="var(--cb-sage)" strokeWidth="3.2" strokeDasharray="5 4" />
        <circle cx="60" cy="44" r="6" fill="var(--cb-amber)" />
        <circle cx="260" cy="50" r="6" fill="var(--cb-amber)" />
        <circle cx="160" cy="78" r="7" fill="var(--cb-amber)" stroke="var(--cb-ink)" strokeWidth="2" />
        <text x="160" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--cb-sage)">
          바위섬·바닥 고정 핀에서 기둥 올리기!
        </text>
      </svg>
    );
  }

  // 2) 절벽 아래 턱 아치 / 외팔보(캔틸레버) 일러스트 (레벨 7, 11, 12-2)
  if (
    hintId.includes('lvl7-') ||
    hintId.includes('lvl11-') ||
    hintId.includes('lvl12-2')
  ) {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-32 block">
        <rect x="8" y="38" width="52" height="72" rx="4" fill="var(--cb-subtle)" />
        <rect x="44" y="68" width="28" height="42" rx="3" fill="var(--cb-subtle)" />
        <rect x="260" y="38" width="52" height="72" rx="4" fill="var(--cb-subtle)" />
        <rect x="248" y="68" width="28" height="42" rx="3" fill="var(--cb-subtle)" />
        <line x1="60" y1="40" x2="260" y2="40" stroke="var(--cb-ink)" strokeWidth="4" strokeLinecap="round" />
        {/* 아치형 하부 버팀대 */}
        <polyline
          points="72,70 122,62 198,62 248,70"
          fill="none"
          stroke="var(--cb-sage)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <line x1="72" y1="70" x2="112" y2="40" stroke="var(--cb-sage)" strokeWidth="3.5" />
        <line x1="122" y1="62" x2="160" y2="40" stroke="var(--cb-sage)" strokeWidth="3.2" strokeDasharray="5 3" />
        <line x1="198" y1="62" x2="160" y2="40" stroke="var(--cb-sage)" strokeWidth="3.2" strokeDasharray="5 3" />
        <line x1="248" y1="70" x2="208" y2="40" stroke="var(--cb-sage)" strokeWidth="3.5" />
        <circle cx="60" cy="40" r="5.5" fill="var(--cb-amber)" />
        <circle cx="260" cy="40" r="5.5" fill="var(--cb-amber)" />
        <circle cx="72" cy="70" r="6.5" fill="var(--cb-amber)" stroke="var(--cb-ink)" strokeWidth="1.8" />
        <circle cx="248" cy="70" r="6.5" fill="var(--cb-amber)" stroke="var(--cb-ink)" strokeWidth="1.8" />
        <text x="160" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--cb-sage)">
          양쪽 절벽 아래 핀에서 아치 버팀대 연결!
        </text>
      </svg>
    );
  }

  // 3) 첫 번째 기초 연결 일러스트 (order === 1)
  if (order === 1) {
    return (
      <svg viewBox="0 0 320 120" className="w-full h-32 block">
        <rect x="12" y="64" width="56" height="44" rx="4" fill="var(--cb-subtle)" />
        <rect x="252" y="64" width="56" height="44" rx="4" fill="var(--cb-subtle)" />
        <line x1="68" y1="66" x2="130" y2="66" stroke="var(--cb-primary)" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="130" y1="66" x2="192" y2="66" stroke="var(--cb-primary)" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="192" y1="66" x2="252" y2="66" stroke="var(--cb-primary)" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="68" cy="66" r="6.5" fill="var(--cb-amber)" stroke="var(--cb-ink)" strokeWidth="1.8" />
        <circle cx="130" cy="66" r="5" fill="var(--cb-surface)" stroke="var(--cb-ink)" strokeWidth="2.2" />
        <circle cx="192" cy="66" r="5" fill="var(--cb-surface)" stroke="var(--cb-ink)" strokeWidth="2.2" />
        <circle cx="252" cy="66" r="6.5" fill="var(--cb-amber)" stroke="var(--cb-ink)" strokeWidth="1.8" />
        <text x="160" y="34" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--cb-ink)">
          짧은 칸마다 점을 찍어 반듯하게 연결해요
        </text>
      </svg>
    );
  }

  // 3) 기본 비교 도해: 네모는 흔들려요 ✕ vs 세모는 튼튼해요 ○
  return (
    <svg viewBox="0 0 320 120" className="w-full h-32 block">
      {/* 왼쪽: 흔들리는 사각형/일자 */}
      <g transform="translate(22, 16)">
        <rect x="18" y="22" width="76" height="46" rx="3" fill="none" stroke="var(--cb-danger)" strokeWidth="3.5" strokeDasharray="5 4" />
        <circle cx="18" cy="22" r="4.5" fill="var(--cb-danger)" />
        <circle cx="94" cy="22" r="4.5" fill="var(--cb-danger)" />
        <circle cx="18" cy="68" r="4.5" fill="var(--cb-danger)" />
        <circle cx="94" cy="68" r="4.5" fill="var(--cb-danger)" />
        <text x="56" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--cb-danger)">
          네모는 흔들려요 ✕
        </text>
      </g>

      {/* 오른쪽: 길 아래 튼튼한 연속 세모(▽) 받침대 */}
      <g transform="translate(172, 16)">
        <rect x="48" y="6" width="32" height="10" rx="2.5" fill="var(--cb-sage)" opacity="0.85" />
        <line x1="12" y1="20" x2="120" y2="20" stroke="var(--cb-sage)" strokeWidth="4" strokeLinecap="round" />
        <polygon points="12,20 42,68 66,20" fill="none" stroke="var(--cb-sage)" strokeWidth="3.6" strokeLinejoin="round" />
        <polygon points="66,20 90,68 120,20" fill="none" stroke="var(--cb-sage)" strokeWidth="3.6" strokeLinejoin="round" />
        <line x1="42" y1="68" x2="90" y2="68" stroke="var(--cb-sage)" strokeWidth="3.6" strokeLinecap="round" />
        <circle cx="12" cy="20" r="4.5" fill="var(--cb-amber)" />
        <circle cx="66" cy="20" r="4" fill="var(--cb-sage)" />
        <circle cx="42" cy="68" r="4" fill="var(--cb-sage)" />
        <circle cx="90" cy="68" r="4" fill="var(--cb-sage)" />
        <circle cx="120" cy="20" r="4.5" fill="var(--cb-amber)" />
        <text x="66" y="92" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--cb-sage)">
          길 아래 세모(▽) ○
        </text>
      </g>
    </svg>
  );
}

/**
 * 섹션 7-3 그림 슬라이드 비법 노트 모달 (Headless UI Dialog)
 */
export function HintModal({ isOpen, levelId, onClose }: HintModalProps) {
  const [hints, setHints] = useState<LevelHint[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const levelHints = getHintsByLevelId(levelId);
      setHints(levelHints.length > 0 ? levelHints : SANDBOX_FALLBACK_HINTS);
      setSlideIndex(0);
    }
  }, [isOpen, levelId]);

  const currentHint = hints[slideIndex];
  const totalSlides = hints.length;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity"
        style={{ backgroundColor: 'var(--cb-backdrop)' }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="w-full max-w-lg rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-2xl text-craft-ink overflow-hidden">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-craft-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-craft-amber-soft text-craft-amber border border-craft-amber/30">
                <BulbIcon size={20} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-extrabold text-craft-ink truncate">
                  다리 비법 노트
                </DialogTitle>
                <p className="text-xs text-craft-muted">
                  그림을 보며 튼튼한 다리 모양을 따라 만들어 보세요
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {totalSlides > 0 && (
                <span className="rounded-full bg-craft-subtle px-3 py-1 text-xs font-extrabold text-craft-ink">
                  {slideIndex + 1} / {totalSlides}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-craft-muted hover:bg-craft-subtle hover:text-craft-ink transition-colors cursor-pointer"
                title="닫기"
              >
                <CloseIcon size={18} />
              </button>
            </div>
          </div>

          {/* 본문 슬라이드 */}
          {currentHint && (
            <div className="pt-5 flex flex-col gap-4">
              {/* 도형 그림 카드 */}
              <div className="rounded-[16px] bg-craft-paper border-[1.5px] border-craft-border p-4">
                <HintIllustrationSvg
                  hintId={currentHint.id}
                  order={currentHint.order}
                />
              </div>

              {/* 쉬운 문장 설명 카드 */}
              <div className="rounded-[16px] bg-craft-bg border border-craft-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-craft-primary px-3 py-0.5 text-xs font-extrabold text-white">
                    비법 {currentHint.order}
                  </span>
                  <h4 className="text-base font-extrabold text-craft-ink">
                    {currentHint.title}
                  </h4>
                </div>
                <p className="text-sm text-craft-muted leading-relaxed">
                  {currentHint.description}
                </p>
              </div>
            </div>
          )}

          {/* 하단 이전 / 다음 슬라이드 & 닫기 */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={slideIndex <= 0}
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                className="flex items-center gap-1.5 rounded-[12px] bg-craft-bg border-[1.5px] border-craft-border-strong px-3.5 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ArrowLeftIcon size={14} />
                <span>이전</span>
              </button>
              <button
                type="button"
                disabled={slideIndex >= totalSlides - 1}
                onClick={() =>
                  setSlideIndex((i) => Math.min(totalSlides - 1, i + 1))
                }
                className="flex items-center gap-1.5 rounded-[12px] bg-craft-bg border-[1.5px] border-craft-border-strong px-3.5 py-2.5 text-xs font-bold text-craft-ink hover:bg-craft-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>다음 비법</span>
                <ArrowRightIcon size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-[12px] bg-craft-primary hover:bg-craft-primary-hover px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_2px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer"
            >
              직접 해볼게요!
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
