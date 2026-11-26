import {
  getScopedDatabase,
  resolveUserStorageScope,
  type LineboundDatabase,
} from '@linebound/infrastructure';
import { appAuthUseCase } from './auth-client';

/**
 * 명시적으로 전달된 userId 또는 현재 활성 세션의 userId를 반환합니다.
 * 비로그인 및 게스트 상태는 'local-guest'로 귀속되어 로그인 계정들과 완전히 격리됩니다.
 */
export function resolveEffectiveUserId(explicitUserId?: string | null): string {
  if (explicitUserId !== undefined) {
    const trimmed = explicitUserId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : 'local-guest';
  }
  const active = appAuthUseCase.getActiveSessionSync();
  if (!active || active.isOffline) {
    return 'local-guest';
  }
  return active.userId || 'local-guest';
}

export function resolveEffectiveStorageScope(
  explicitUserId?: string | null,
): string {
  return resolveUserStorageScope(resolveEffectiveUserId(explicitUserId));
}

/**
 * 현재 활성 계정 전용으로 격리된 IndexedDB 인스턴스를 반환합니다.
 */
export function getUserDatabase(
  explicitUserId?: string | null,
): LineboundDatabase {
  return getScopedDatabase(resolveEffectiveUserId(explicitUserId));
}
