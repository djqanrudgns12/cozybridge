import type { IAuthService, UserSession } from '@linebound/infrastructure';

const MAX_NICKNAME_LENGTH = 16;

function normalizeNickname(
  displayName?: string,
  required: boolean = false,
): string | undefined {
  const trimmed = displayName?.trim();
  if (!trimmed) {
    if (required) {
      throw new Error('사용할 내 별명을 입력해 주세요.');
    }
    return undefined;
  }
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    throw new Error(`별명은 ${MAX_NICKNAME_LENGTH}글자 이하로 입력해 주세요.`);
  }
  return trimmed;
}

/**
 * 사용자 인증 유스케이스 (PRD 6.1, 6.2)
 */
export class AuthUseCase {
  constructor(private authService: IAuthService) {}

  async signIn(
    email: string,
    password: string,
    preferredDisplayName?: string,
  ): Promise<UserSession> {
    if (!email.trim() || !password) {
      throw new Error('이메일과 비밀번호를 입력해주세요.');
    }
    const normalizedName = normalizeNickname(preferredDisplayName, false);
    return this.authService.signIn(email.trim(), password, normalizedName);
  }

  async signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<UserSession> {
    if (!email.trim() || !password) {
      throw new Error('이메일과 비밀번호를 입력해주세요.');
    }
    if (password.length < 6) {
      throw new Error('비밀번호는 최소 6자 이상이어야 합니다.');
    }
    const normalizedName = normalizeNickname(displayName, false);
    return this.authService.signUp(email.trim(), password, normalizedName);
  }

  signInAsGuest(displayName?: string): UserSession {
    const normalizedName = normalizeNickname(displayName, false);
    return this.authService.signInAsGuest(normalizedName);
  }

  async updateDisplayName(displayName: string): Promise<UserSession> {
    const normalizedName = normalizeNickname(displayName, true)!;
    if (this.authService.updateDisplayName) {
      return this.authService.updateDisplayName(normalizedName);
    }
    return this.authService.signInAsGuest(normalizedName);
  }

  getSavedDisplayName(email: string): string | null {
    return this.authService.getSavedDisplayName?.(email) ?? null;
  }

  isEmailRegistered(email: string): boolean {
    return this.authService.isEmailRegistered?.(email) ?? false;
  }

  getActiveSessionSync(): UserSession | null {
    return this.authService.getActiveSessionSync?.() ?? null;
  }

  async signOut(): Promise<void> {
    return this.authService.signOut();
  }

  async getCurrentSession(): Promise<UserSession | null> {
    return this.authService.getCurrentSession();
  }
}
