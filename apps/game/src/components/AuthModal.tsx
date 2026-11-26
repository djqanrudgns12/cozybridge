import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { UserSession } from '@cozybridge/infrastructure';
import { appAuthUseCase } from '../utils/auth-client';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CloseIcon,
  EditPenIcon,
  PlayIcon,
  UserIcon,
} from './ui/Icons';

export interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'auth' | 'rename';
  currentSession?: UserSession | null;
  onSuccess: (session: UserSession) => void;
  onLogout?: () => void;
  onClose: () => void;
}

/**
 * 섹션 7-3 시작 방법 선택 · 계정 로그인 · 내 별명 변경 모달 (Headless UI Dialog + Tailwind CSS)
 * - 이메일 앞글자나 임의 이름으로 멋대로 바뀌지 않고, 내가 정한 별명을 그대로 저장하고 언제든 바꿀 수 있습니다.
 * - 회원가입 시 이미 가입된 이메일 주소를 즉시 감지해 중복 계정 생성 및 기존 계정 덮어쓰기를 원천 차단합니다.
 */
export function AuthModal({
  isOpen,
  initialMode = 'auth',
  currentSession = null,
  onSuccess,
  onLogout,
  onClose,
}: AuthModalProps) {
  const [step, setStep] = useState<'choose' | 'form' | 'rename'>('choose');
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [hasEditedName, setHasEditedName] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setPassword('');

    if (initialMode === 'rename' && currentSession) {
      setStep('rename');
      setDisplayName(currentSession.displayName);
      setEmail(currentSession.isOffline ? '' : currentSession.email);
      setHasEditedName(true);
    } else {
      setStep('choose');
      setTab('signin');
      setEmail('');
      setDisplayName('');
      setHasEditedName(false);
    }
  }, [currentSession, initialMode, isOpen]);

  const trimmedEmail = email.trim();
  const savedNameForEmail = trimmedEmail
    ? appAuthUseCase.getSavedDisplayName(trimmedEmail)
    : null;
  const isDuplicateSignupEmail =
    tab === 'signup' &&
    trimmedEmail.length > 0 &&
    appAuthUseCase.isEmailRegistered(trimmedEmail);

  const handleSwitchTab = (nextTab: 'signin' | 'signup') => {
    setTab(nextTab);
    setErrorMsg(null);

    if (nextTab === 'signup') {
      // 회원가입 탭에서는 기존 계정의 별명이 자동으로 따라오지 않도록 비워 둠
      if (!hasEditedName) {
        setDisplayName('');
      }
    } else if (!hasEditedName && savedNameForEmail) {
      setDisplayName(savedNameForEmail);
    }
  };

  const handleEmailChange = (nextEmail: string) => {
    setEmail(nextEmail);
    setErrorMsg(null);

    if (tab === 'signin') {
      const saved = appAuthUseCase.getSavedDisplayName(nextEmail);
      if (saved && !hasEditedName) {
        setDisplayName(saved);
      } else if (!saved && !hasEditedName) {
        setDisplayName('');
      }
    }
  };

  const handleDisplayNameChange = (nextName: string) => {
    setDisplayName(nextName);
    setHasEditedName(nextName.trim().length > 0);
  };

  const handleGuest = () => {
    setErrorMsg(null);
    try {
      const guestSession = appAuthUseCase.signInAsGuest(
        displayName.trim() || undefined,
      );
      onSuccess(guestSession);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : '별명을 다시 한 번 확인해 주세요.',
      );
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = displayName.trim();
    if (!trimmed) {
      setErrorMsg('새로 사용할 내 별명을 1글자 이상 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const updated = await appAuthUseCase.updateDisplayName(trimmed);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : '별명을 바꾸는 중 문제가 생겼어요.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = displayName.trim();

    if (tab === 'signup') {
      if (isDuplicateSignupEmail) {
        setErrorMsg(
          '이미 가입된 이메일 주소예요. [로그인하기] 탭에서 로그인해 주세요.',
        );
        return;
      }
      if (!trimmedName) {
        setErrorMsg('게임에서 사용할 내 별명을 입력해 주세요.');
        return;
      }
    }

    if (tab === 'signin' && !trimmedName && !savedNameForEmail) {
      setErrorMsg(
        '처음 로그인하는 이메일이에요! [새로 가입하기] 탭에서 계정을 먼저 만들거나 별명을 적어 주세요.',
      );
      return;
    }

    setLoading(true);
    try {
      if (tab === 'signin') {
        const session = await appAuthUseCase.signIn(
          email,
          password,
          trimmedName || savedNameForEmail || undefined,
        );
        onSuccess(session);
        onClose();
      } else {
        const session = await appAuthUseCase.signUp(
          email,
          password,
          trimmedName,
        );
        onSuccess(session);
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : '로그인 정보를 다시 한 번 확인해 주세요.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitleText =
    step === 'rename'
      ? '내 별명 바꾸기'
      : step === 'choose'
      ? '어떻게 시작할까요?'
      : tab === 'signin'
      ? '내 계정으로 로그인'
      : '새 계정 만들기';

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
            <div className="flex items-center gap-2.5 min-w-0">
              {step === 'form' && (
                <button
                  type="button"
                  onClick={() => {
                    setStep('choose');
                    setErrorMsg(null);
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-craft-bg border border-craft-border text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
                  title="시작 방법 다시 고르기"
                >
                  <ArrowLeftIcon size={16} />
                </button>
              )}
              <DialogTitle className="text-lg font-extrabold text-craft-ink truncate">
                {dialogTitleText}
              </DialogTitle>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-craft-muted hover:bg-craft-subtle hover:text-craft-ink transition-colors cursor-pointer"
              title="닫기"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {step === 'rename' ? (
            <div className="pt-5">
              <div className="mb-4 flex items-center justify-between gap-2 rounded-[12px] bg-craft-bg border border-craft-border px-3.5 py-2.5 text-xs">
                <span className="font-bold text-craft-muted">현재 로그인 상태</span>
                <span className="font-extrabold text-craft-ink truncate">
                  {currentSession?.isOffline
                    ? '게스트 모드 (이 기기에 저장)'
                    : currentSession?.email}
                </span>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[12px] bg-craft-danger-soft border border-craft-danger/30 px-4 py-3 text-xs font-bold text-craft-danger">
                  <AlertTriangleIcon size={17} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="rename-nickname-input"
                      className="block text-xs font-bold text-craft-ink"
                    >
                      사용할 내 별명
                    </label>
                    <span className="text-[11px] font-semibold text-craft-muted">
                      최대 16글자
                    </span>
                  </div>
                  <input
                    id="rename-nickname-input"
                    type="text"
                    maxLength={16}
                    autoFocus
                    value={displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="원하는 별명을 입력해 주세요 (예: 다리박사)"
                    className="w-full rounded-[12px] bg-craft-bg px-4 py-3 text-sm font-bold text-craft-ink border-[1.5px] border-craft-border focus:outline-none focus:border-craft-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full rounded-[14px] bg-craft-primary hover:bg-craft-primary-hover px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_3px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  <EditPenIcon size={16} />
                  <span>{loading ? '저장하는 중...' : '이 별명으로 저장하기'}</span>
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-craft-border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('choose');
                      setTab('signin');
                      setEmail('');
                      setPassword('');
                      setDisplayName('');
                      setHasEditedName(false);
                      setErrorMsg(null);
                    }}
                    className="font-bold text-craft-muted hover:text-craft-ink transition-colors cursor-pointer"
                  >
                    다른 계정으로 로그인하기
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="font-bold text-craft-danger hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      로그아웃
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : step === 'choose' ? (
            <div className="pt-5">
              <p className="text-sm text-craft-muted mb-4 leading-relaxed">
                내 별명을 먼저 정하고 바로 놀거나, 내 계정으로 로그인해 다리를 보관할 수 있어요.
              </p>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[12px] bg-craft-danger-soft border border-craft-danger/30 px-4 py-3 text-xs font-bold text-craft-danger">
                  <AlertTriangleIcon size={17} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 시작 전 별명 직접 입력칸 (선택) */}
              <div className="mb-4 rounded-[14px] bg-craft-bg border-[1.5px] border-craft-border p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="choose-nickname-input"
                    className="text-xs font-extrabold text-craft-ink"
                  >
                    게임에서 부를 내 별명
                  </label>
                  <span className="text-[11px] font-semibold text-craft-muted">
                    비워두면 게스트 엔지니어
                  </span>
                </div>
                <input
                  id="choose-nickname-input"
                  type="text"
                  maxLength={16}
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="원하는 별명을 적어보세요 (예: 튼튼다리왕)"
                  className="w-full rounded-[10px] bg-craft-surface px-3.5 py-2.5 text-sm font-bold text-craft-ink border border-craft-border focus:outline-none focus:border-craft-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 카드 1: 바로 놀기 (게스트) */}
                <button
                  type="button"
                  onClick={handleGuest}
                  className="group flex flex-col justify-between rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border hover:border-craft-sage p-5 text-left transition-all cursor-pointer"
                >
                  <div>
                    <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-craft-sage-soft text-craft-sage border border-craft-sage/25">
                      <PlayIcon size={20} />
                    </div>
                    <div className="text-base font-extrabold text-craft-ink">
                      바로 놀기
                    </div>
                    <p className="mt-1.5 text-xs text-craft-muted leading-relaxed">
                      이메일 없이 지금 당장 시작해요. 위에서 적은 내 별명으로 바로 들어가요.
                    </p>
                  </div>

                  <div className="mt-5 w-full rounded-[12px] bg-craft-sage px-4 py-2.5 text-center text-xs font-extrabold text-white group-hover:opacity-95 transition-opacity">
                    게스트로 바로 시작
                  </div>
                </button>

                {/* 카드 2: 내 계정 로그인 */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setErrorMsg(null);
                  }}
                  className="group flex flex-col justify-between rounded-[16px] bg-craft-bg border-[1.5px] border-craft-border hover:border-craft-primary p-5 text-left transition-all cursor-pointer"
                >
                  <div>
                    <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-[14px] bg-craft-accent-soft text-craft-accent border border-craft-accent/25">
                      <UserIcon size={21} />
                    </div>
                    <div className="text-base font-extrabold text-craft-ink">
                      내 계정 로그인
                    </div>
                    <p className="mt-1.5 text-xs text-craft-muted leading-relaxed">
                      내 별명과 이메일을 함께 저장해 두면 언제 들어와도 내 진행 상황이 따로 유지돼요.
                    </p>
                  </div>

                  <div className="mt-5 w-full rounded-[12px] bg-craft-primary px-4 py-2.5 text-center text-xs font-extrabold text-white group-hover:bg-craft-primary-hover transition-colors">
                    로그인 · 가입하기
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-5">
              {/* 로그인 / 새로 가입하기 탭 */}
              <div className="grid grid-cols-2 gap-1.5 rounded-[12px] bg-craft-bg border border-craft-border p-1.5 mb-5">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('signin')}
                  className={`rounded-[9px] px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                    tab === 'signin'
                      ? 'bg-craft-surface text-craft-ink shadow-xs border border-craft-border'
                      : 'text-craft-muted hover:text-craft-ink'
                  }`}
                >
                  로그인하기
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab('signup')}
                  className={`rounded-[9px] px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                    tab === 'signup'
                      ? 'bg-craft-surface text-craft-ink shadow-xs border border-craft-border'
                      : 'text-craft-muted hover:text-craft-ink'
                  }`}
                >
                  새로 가입하기
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 flex items-center gap-2.5 rounded-[12px] bg-craft-danger-soft border border-craft-danger/30 px-4 py-3 text-xs font-bold text-craft-danger">
                  <AlertTriangleIcon size={17} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="auth-email-input"
                    className="block text-xs font-bold text-craft-ink mb-1.5"
                  >
                    이메일 주소
                  </label>
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="myname@example.com"
                    className={`w-full rounded-[12px] bg-craft-bg px-4 py-3 text-sm text-craft-ink border-[1.5px] focus:outline-none ${
                      isDuplicateSignupEmail
                        ? 'border-craft-danger focus:border-craft-danger'
                        : 'border-craft-border focus:border-craft-primary'
                    }`}
                  />
                  {isDuplicateSignupEmail && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-craft-danger-soft border border-craft-danger/30 px-3 py-2 text-xs font-bold text-craft-danger">
                      <span>이미 가입된 이메일 주소예요. 같은 이메일로는 새로 가입할 수 없어요.</span>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('signin')}
                        className="rounded-[8px] bg-craft-surface border border-craft-danger/30 px-2.5 py-1 text-[11px] font-extrabold text-craft-ink hover:bg-craft-subtle transition-colors cursor-pointer"
                      >
                        로그인하기 탭으로 이동
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="auth-nickname-input"
                      className="block text-xs font-bold text-craft-ink"
                    >
                      내 별명
                    </label>
                    <span className="text-[11px] font-semibold text-craft-sage">
                      {tab === 'signin' && savedNameForEmail
                        ? '저장된 내 별명을 불러왔어요'
                        : '내가 원하는 별명으로 표시돼요'}
                    </span>
                  </div>
                  <input
                    id="auth-nickname-input"
                    type="text"
                    maxLength={16}
                    value={displayName}
                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                    placeholder="예: 다리박사 (최대 16글자)"
                    className="w-full rounded-[12px] bg-craft-bg px-4 py-3 text-sm font-bold text-craft-ink border-[1.5px] border-craft-border focus:outline-none focus:border-craft-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password-input"
                    className="block text-xs font-bold text-craft-ink mb-1.5"
                  >
                    비밀번호
                  </label>
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6글자 이상 입력해 주세요"
                    className="w-full rounded-[12px] bg-craft-bg px-4 py-3 text-sm text-craft-ink border-[1.5px] border-craft-border focus:outline-none focus:border-craft-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || isDuplicateSignupEmail}
                  className="mt-1 w-full rounded-[14px] bg-craft-primary hover:bg-craft-primary-hover px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_3px_0_var(--cb-primary-shadow)] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? '잠시만 기다려 주세요...'
                    : tab === 'signin'
                    ? '로그인 완료'
                    : '계정 만들고 시작하기'}
                </button>
              </form>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
