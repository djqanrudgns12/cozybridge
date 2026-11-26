import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { BridgeVersion } from '@linebound/domain';
import { MiniBridgeThumbSvg } from './ui/BridgePreviewSvg';
import { CloseIcon, HistoryIcon } from './ui/Icons';

interface VersionHistoryModalProps {
  isOpen: boolean;
  versions: BridgeVersion[];
  currentVersionId?: string;
  onRestore: (versionId: string) => void;
  onClose: () => void;
}

/**
 * 저장 기록 모달 (테마 토큰 호환)
 */
export function VersionHistoryModal({
  isOpen,
  versions,
  currentVersionId,
  onRestore,
  onClose,
}: VersionHistoryModalProps) {
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 backdrop-blur-[2px]"
        style={{ backgroundColor: 'var(--lb-backdrop)' }}
      />
      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="w-full max-w-lg rounded-[20px] bg-craft-surface border-[1.5px] border-craft-border p-6 shadow-2xl text-craft-ink">
          <div className="flex items-center justify-between pb-4 border-b border-craft-border">
            <div className="flex items-center gap-2.5">
              <HistoryIcon size={18} />
              <DialogTitle className="text-lg font-extrabold">
                저장 기록
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-craft-muted hover:bg-craft-subtle hover:text-craft-ink cursor-pointer"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto flex flex-col gap-3 pt-4 pr-1">
            {versions.length === 0 ? (
              <div className="py-8 text-center text-xs text-craft-muted">
                남겨 둔 저장 기록이 아직 없어요.
              </div>
            ) : (
              versions
                .slice()
                .reverse()
                .map((ver) => {
                  const isCurrent = ver.id === currentVersionId;
                  return (
                    <div
                      key={ver.id}
                      className="flex items-center justify-between gap-3 rounded-[14px] bg-craft-bg border border-craft-border p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MiniBridgeThumbSvg
                          design={ver.snapshot}
                          className="w-20 h-14 shrink-0"
                        />
                        <div>
                          <div className="text-sm font-extrabold text-craft-ink">
                            기록 #{ver.versionNumber}{' '}
                            {isCurrent && (
                              <span className="ml-1 text-xs text-craft-primary">
                                (현재)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-craft-muted mt-0.5">
                            막대 {ver.snapshot.members.size}개 ·{' '}
                            {formatDate(ver.createdAt)}
                          </div>
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onRestore(ver.id)}
                          className="rounded-[10px] bg-craft-surface border border-craft-border-strong px-3.5 py-2 text-xs font-extrabold text-craft-ink hover:bg-craft-subtle cursor-pointer"
                        >
                          되돌리기
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
