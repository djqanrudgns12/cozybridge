import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { THEME_OPTIONS } from '../../styles/design-tokens';
import { useTheme } from '../../styles/ThemeContext';

interface ThemeSwitcherProps {
  compact?: boolean;
}

/**
 * 사용자가 언제든 화면 분위기를 바꿀 수 있는 테마 전환 팝오버 (Headless UI Popover)
 * 선택한 테마는 로컬에 저장되며 UI 전체와 모눈 스케치북 캔버스에 즉시 반영됩니다.
 */
export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const currentMeta =
    THEME_OPTIONS.find((item) => item.id === theme) ?? THEME_OPTIONS[0];

  return (
    <Popover className="relative">
      <PopoverButton
        title="화면 테마 바꾸기"
        className={`
          flex items-center gap-2 rounded-[12px] bg-craft-surface border-[1.5px] border-craft-border-strong
          text-craft-ink hover:bg-craft-subtle/70 transition-colors cursor-pointer focus:outline-none
          ${compact ? 'px-2.5 py-1.5 text-xs font-semibold' : 'px-3.5 py-2 text-xs font-bold shadow-xs'}
        `}
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-black/15 shrink-0"
          style={{ backgroundColor: currentMeta.swatchPrimary }}
        />
        <span>{compact ? '테마' : currentMeta.name}</span>
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        className="z-50 mt-2 w-72 rounded-[18px] bg-craft-surface border-[1.5px] border-craft-border p-3.5 shadow-xl focus:outline-none"
      >
        {({ close }) => (
          <div className="flex flex-col gap-2">
            <div className="px-1 pb-1.5 border-b border-craft-border">
              <div className="text-xs font-extrabold text-craft-ink">
                화면 테마 고르기
              </div>
              <div className="text-xs text-craft-muted mt-0.5">
                버튼과 모눈 스케치북 색상이 함께 바뀌어요
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-0.5">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = opt.id === theme;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTheme(opt.id);
                      close();
                    }}
                    className={`
                      flex items-center justify-between gap-3 rounded-[12px] p-2.5 text-left transition-all cursor-pointer border
                      ${
                        isSelected
                          ? 'bg-craft-subtle/80 border-craft-primary ring-1 ring-craft-primary/30'
                          : 'bg-craft-surface border-craft-border hover:bg-craft-subtle/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center -space-x-1 shrink-0">
                        <span
                          className="h-5 w-5 rounded-full border border-black/15"
                          style={{ backgroundColor: opt.swatchBg }}
                        />
                        <span
                          className="h-5 w-5 rounded-full border border-white/80"
                          style={{ backgroundColor: opt.swatchPrimary }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-craft-ink">
                          {opt.name}
                        </div>
                        <div className="text-xs text-craft-muted truncate">
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-xs font-extrabold text-craft-primary shrink-0">
                        사용 중
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
