import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  AlertTriangleIcon,
  BulbIcon,
  TrashIcon,
} from './ui/Icons';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  tone?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 섹션 7-3 일러스트 공통 확인/알림창 (Headless UI Dialog)
 * 브라우저 기본 alert() / confirm()을 100% 대체합니다.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '그냥 둘래요',
  hideCancel = false,
  tone = 'warning',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const iconToneClass =
    tone === 'danger'
      ? 'bg-craft-danger-soft text-craft-danger border-craft-danger/25'
      : tone === 'info'
      ? 'bg-craft-accent-soft text-craft-accent border-craft-accent/25'
      : 'bg-craft-amber-soft text-craft-amber border-craft-amber/25';

  const confirmBtnClass =
    tone === 'danger'
      ? 'bg-craft-danger text-white hover:opacity-95 shadow-[0_3px_0_rgba(0,0,0,0.18)]'
      : 'bg-craft-primary text-white hover:bg-craft-primary-hover shadow-[0_3px_0_var(--lb-primary-shadow)]';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity"
        style={{ backgroundColor: 'var(--lb-backdrop)' }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="w-full max-w-sm rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-2xl text-craft-ink overflow-hidden">
          <div className="flex flex-col items-center text-center">
            <div
              className={`mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border ${iconToneClass}`}
            >
              {tone === 'danger' ? (
                <TrashIcon size={26} />
              ) : tone === 'info' ? (
                <BulbIcon size={26} />
              ) : (
                <AlertTriangleIcon size={26} />
              )}
            </div>

            <DialogTitle className="text-lg font-extrabold text-craft-ink leading-snug">
              {title}
            </DialogTitle>

            <p className="mt-2 text-sm text-craft-muted leading-relaxed">
              {description}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2.5">
            {!hideCancel && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[12px] bg-craft-bg border-[1.5px] border-craft-border-strong px-4 py-3 text-sm font-bold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 rounded-[12px] px-4 py-3 text-sm font-extrabold transition-all active:translate-y-0.5 cursor-pointer ${confirmBtnClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
