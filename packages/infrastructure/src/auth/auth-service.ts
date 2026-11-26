import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface UserSession {
  userId: string;
  email: string;
  displayName: string;
  isOffline: boolean;
}

export interface AuthServiceOptions {
  /** 브라우저 localStorage에 현재 로그인 세션과 계정 레지스트리를 영구 보관할지 여부 */
  persistSession?: boolean;
  /** 로컬 모드에서 사전 회원가입 없는 이메일 로그인을 엄격히 차단할지 여부 (persistSession이 true이면 기본 활성화) */
  strictLocalAuth?: boolean;
}

interface LocalAccountProfile {
  userId: string;
  email: string;
  displayName: string;
  passwordHash?: string;
}

const ACTIVE_SESSION_STORAGE_KEY = 'linebound:active-session:v1';
const ACCOUNT_REGISTRY_STORAGE_KEY = 'linebound:auth-accounts:v1';
const GUEST_NICKNAME_STORAGE_KEY = 'linebound:guest-nickname:v1';

const DUPLICATE_EMAIL_ERROR_MESSAGE =
  '이미 가입된 이메일 주소예요. [로그인하기] 탭에서 로그인해 주세요.';
const INVALID_CREDENTIALS_ERROR_MESSAGE =
  '이메일 또는 비밀번호가 올바르지 않아요.';
const UNREGISTERED_EMAIL_ERROR_MESSAGE =
  '가입되지 않은 이메일 주소예요. [새로 가입하기] 탭에서 먼저 계정을 만들어 주세요.';

function generateUniqueLocalUserId(): string {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto?.randomUUID === 'function'
  ) {
    return `local-user-${globalThis.crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `local-user-${Date.now()}-${rand}`;
}

/**
 * 비밀번호 평문 저장을 금지하는 PRD 10.1 정책에 따라 솔트 결합 SHA-256 해시를 생성합니다.
 */
async function hashAccountPassword(
  normalizedEmail: string,
  password: string,
): Promise<string> {
  const input = `linebound-auth:v1:${normalizedEmail}:${password}`;

  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto?.subtle &&
    typeof TextEncoder !== 'undefined'
  ) {
    const encoded = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Web Crypto 미지원 환경을 위한 결정론적 다중 라운드 해시 폴백 (평문 미저장)
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

function mapSupabaseSignUpError(rawMessage?: string): string {
  const lower = (rawMessage ?? '').toLowerCase();
  if (
    lower.includes('already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return DUPLICATE_EMAIL_ERROR_MESSAGE;
  }
  return rawMessage || '회원가입에 실패했습니다.';
}

function mapSupabaseSignInError(rawMessage?: string): string {
  const lower = (rawMessage ?? '').toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('email not confirmed')
  ) {
    return INVALID_CREDENTIALS_ERROR_MESSAGE;
  }
  return rawMessage || '로그인에 실패했습니다.';
}

export interface IAuthService {
  signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<UserSession>;
  signIn(
    email: string,
    password: string,
    preferredDisplayName?: string,
  ): Promise<UserSession>;
  signInAsGuest(displayName?: string): UserSession;
  updateDisplayName?(displayName: string): Promise<UserSession>;
  getSavedDisplayName?(email: string): string | null;
  isEmailRegistered?(email: string): boolean;
  getActiveSessionSync?(): UserSession | null;
  signOut(): Promise<void>;
  getCurrentSession(): Promise<UserSession | null>;
  isOnline(): boolean;
}

/**
 * Supabase Auth 기반 인증 서비스 (PRD 6.1, 6.2, 10.1)
 * - 중복 이메일 회원가입을 차단하고 각 계정에 독립적인 고유 userId를 부여합니다.
 * - 로컬 환경에서도 비밀번호를 해시로만 검증하며 가입한 별명과 세션을 안전하게 보존합니다.
 */
export class SupabaseAuthService implements IAuthService {
  private supabase: SupabaseClient | null = null;
  private currentGuestSession: UserSession | null = null;
  private readonly persistSession: boolean;
  private readonly strictLocalAuth: boolean;
  private readonly localAccounts = new Map<string, LocalAccountProfile>();

  constructor(
    supabaseUrl?: string,
    supabaseAnonKey?: string,
    options?: AuthServiceOptions,
  ) {
    this.persistSession = options?.persistSession ?? false;
    this.strictLocalAuth = options?.strictLocalAuth ?? this.persistSession;

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    if (this.persistSession) {
      this.hydrateFromStorage();
    }
  }

  isOnline(): boolean {
    const navOnline =
      typeof navigator !== 'undefined' ? navigator.onLine : true;
    return navOnline && this.supabase !== null;
  }

  isEmailRegistered(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    if (this.persistSession) {
      this.reloadAccountsFromStorage();
    }
    return this.localAccounts.has(normalized);
  }

  getSavedDisplayName(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    if (this.persistSession) {
      this.reloadAccountsFromStorage();
    }
    return this.localAccounts.get(normalized)?.displayName ?? null;
  }

  getActiveSessionSync(): UserSession | null {
    if (this.persistSession) {
      this.loadActiveSessionFromStorage();
    }
    return this.currentGuestSession;
  }

  async signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<UserSession> {
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const trimmedName = displayName?.trim();

    if (!this.supabase) {
      if (this.persistSession) {
        this.reloadAccountsFromStorage();
      }

      if (this.localAccounts.has(normalizedEmail)) {
        throw new Error(DUPLICATE_EMAIL_ERROR_MESSAGE);
      }

      const resolvedName =
        trimmedName || trimmedEmail.split('@')[0] || '플레이어';
      const userId = generateUniqueLocalUserId();
      const passwordHash = await hashAccountPassword(normalizedEmail, password);

      this.saveAccountProfile({
        userId,
        email: normalizedEmail,
        displayName: resolvedName,
        passwordHash,
      });

      const localSession: UserSession = {
        userId,
        email: trimmedEmail,
        displayName: resolvedName,
        isOffline: false,
      };
      this.setActiveSession(localSession);
      return localSession;
    }

    const { data, error } = await this.supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          display_name: trimmedName || trimmedEmail.split('@')[0],
        },
      },
    });

    if (error || !data.user) {
      throw new Error(mapSupabaseSignUpError(error?.message));
    }

    // Supabase 이메일 열거 방지(Confirm Email) 설정 시 이미 가입된 이메일은 빈 identities 배열을 반환함
    if (
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      throw new Error(DUPLICATE_EMAIL_ERROR_MESSAGE);
    }

    const mapped = this.mapSupabaseUser(data.user);
    this.setActiveSession(mapped);
    return mapped;
  }

  async signIn(
    email: string,
    password: string,
    preferredDisplayName?: string,
  ): Promise<UserSession> {
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const trimmedPreferred = preferredDisplayName?.trim();

    if (!this.supabase) {
      if (this.persistSession) {
        this.reloadAccountsFromStorage();
      }

      const existing = this.localAccounts.get(normalizedEmail);
      if (!existing && this.strictLocalAuth) {
        throw new Error(UNREGISTERED_EMAIL_ERROR_MESSAGE);
      }

      const inputHash = await hashAccountPassword(normalizedEmail, password);
      if (existing?.passwordHash && existing.passwordHash !== inputHash) {
        throw new Error(INVALID_CREDENTIALS_ERROR_MESSAGE);
      }

      const resolvedName =
        trimmedPreferred ||
        existing?.displayName ||
        trimmedEmail.split('@')[0] ||
        '플레이어';
      const userId = existing?.userId ?? generateUniqueLocalUserId();

      this.saveAccountProfile({
        userId,
        email: normalizedEmail,
        displayName: resolvedName,
        passwordHash: existing?.passwordHash ?? inputHash,
      });

      const localSession: UserSession = {
        userId,
        email: trimmedEmail,
        displayName: resolvedName,
        isOffline: false,
      };
      this.setActiveSession(localSession);
      return localSession;
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error(mapSupabaseSignInError(error?.message));
    }

    let user = data.user;
    if (
      trimmedPreferred &&
      trimmedPreferred !== (user.user_metadata?.display_name as string | undefined)
    ) {
      const updated = await this.supabase.auth.updateUser({
        data: { display_name: trimmedPreferred },
      });
      if (updated.data.user) {
        user = updated.data.user;
      }
    }

    const mapped = this.mapSupabaseUser(user);
    this.setActiveSession(mapped);
    return mapped;
  }

  signInAsGuest(displayName?: string): UserSession {
    const trimmed = displayName?.trim();
    if (trimmed && this.persistSession) {
      this.writeRawStorage(GUEST_NICKNAME_STORAGE_KEY, trimmed);
    }

    const savedGuestName = this.persistSession
      ? this.readRawStorage(GUEST_NICKNAME_STORAGE_KEY)
      : null;

    const guest: UserSession = {
      userId: 'local-guest',
      email: 'guest@linebound.local',
      displayName: trimmed || savedGuestName || '게스트 엔지니어',
      isOffline: true,
    };
    this.setActiveSession(guest);
    return guest;
  }

  async updateDisplayName(displayName: string): Promise<UserSession> {
    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('사용할 별명을 입력해 주세요.');
    }

    const current = await this.getCurrentSession();
    if (!current) {
      return this.signInAsGuest(trimmed);
    }

    if (this.supabase && !current.isOffline) {
      const { data, error } = await this.supabase.auth.updateUser({
        data: { display_name: trimmed },
      });
      if (error) {
        throw new Error(error.message);
      }
      if (data.user) {
        const mapped = this.mapSupabaseUser(data.user);
        this.setActiveSession(mapped);
        return mapped;
      }
    }

    const updatedSession: UserSession = {
      ...current,
      displayName: trimmed,
    };

    if (current.isOffline) {
      if (this.persistSession) {
        this.writeRawStorage(GUEST_NICKNAME_STORAGE_KEY, trimmed);
      }
    } else {
      if (this.persistSession) {
        this.reloadAccountsFromStorage();
      }
      const normalizedEmail = current.email.trim().toLowerCase();
      const existing = this.localAccounts.get(normalizedEmail);
      this.saveAccountProfile({
        userId: current.userId,
        email: normalizedEmail,
        displayName: trimmed,
        passwordHash: existing?.passwordHash,
      });
    }

    this.setActiveSession(updatedSession);
    return updatedSession;
  }

  async signOut(): Promise<void> {
    this.currentGuestSession = null;
    if (this.persistSession) {
      this.removeStorage(ACTIVE_SESSION_STORAGE_KEY);
    }
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
  }

  async getCurrentSession(): Promise<UserSession | null> {
    if (this.persistSession) {
      this.loadActiveSessionFromStorage();
    }

    if (this.currentGuestSession) {
      return this.currentGuestSession;
    }

    if (!this.supabase) {
      return null;
    }

    const { data } = await this.supabase.auth.getSession();
    if (!data.session?.user) return null;

    return this.mapSupabaseUser(data.session.user);
  }

  private mapSupabaseUser(user: User): UserSession {
    return {
      userId: user.id,
      email: user.email ?? '',
      displayName:
        (user.user_metadata?.display_name as string) ??
        user.email?.split('@')[0] ??
        '플레이어',
      isOffline: false,
    };
  }

  private setActiveSession(session: UserSession): void {
    this.currentGuestSession = session;
    if (this.persistSession) {
      this.writeRawStorage(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }

  private saveAccountProfile(profile: LocalAccountProfile): void {
    this.localAccounts.set(profile.email, profile);
    if (this.persistSession) {
      const obj: Record<string, LocalAccountProfile> = {};
      for (const [key, val] of this.localAccounts.entries()) {
        obj[key] = val;
      }
      this.writeRawStorage(ACCOUNT_REGISTRY_STORAGE_KEY, JSON.stringify(obj));
    }
  }

  private hydrateFromStorage(): void {
    this.reloadAccountsFromStorage();
    this.loadActiveSessionFromStorage();
  }

  private reloadAccountsFromStorage(): void {
    this.localAccounts.clear();
    const raw = this.readRawStorage(ACCOUNT_REGISTRY_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, LocalAccountProfile>;
      for (const [key, val] of Object.entries(parsed)) {
        if (
          val &&
          typeof val.userId === 'string' &&
          typeof val.displayName === 'string'
        ) {
          this.localAccounts.set(key.trim().toLowerCase(), val);
        }
      }
    } catch {
      // 손상된 로컬 캐시 무시
    }
  }

  private loadActiveSessionFromStorage(): void {
    const raw = this.readRawStorage(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) {
      this.currentGuestSession = null;
      return;
    }
    try {
      const parsed = JSON.parse(raw) as UserSession;
      if (
        parsed &&
        typeof parsed.userId === 'string' &&
        typeof parsed.displayName === 'string'
      ) {
        this.currentGuestSession = parsed;
      }
    } catch {
      this.currentGuestSession = null;
    }
  }

  private readRawStorage(key: string): string | null {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        return globalThis.localStorage.getItem(key);
      }
    } catch {
      // 스토리지 접근 불가 환경 무시
    }
    return null;
  }

  private writeRawStorage(key: string, value: string): void {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        globalThis.localStorage.setItem(key, value);
      }
    } catch {
      // 스토리지 접근 불가 환경 무시
    }
  }

  private removeStorage(key: string): void {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        globalThis.localStorage.removeItem(key);
      }
    } catch {
      // 스토리지 접근 불가 환경 무시
    }
  }
}
