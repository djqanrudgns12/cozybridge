import { resolveEffectiveStorageScope } from './user-storage';

const GUEST_LESSON_PROGRESS_KEY = 'linebound:completed-lessons:v1';

function getLessonProgressStorageKey(userId?: string | null): string {
  const scope = resolveEffectiveStorageScope(userId);
  return scope === 'guest'
    ? GUEST_LESSON_PROGRESS_KEY
    : `linebound:completed-lessons:v2:${scope}`;
}

export function getCompletedLessonIds(userId?: string | null): Set<string> {
  try {
    const key = getLessonProgressStorageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

export function markLessonCompleted(
  lessonId: string,
  userId?: string | null,
): Set<string> {
  const next = getCompletedLessonIds(userId);
  next.add(lessonId);
  try {
    const key = getLessonProgressStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
  } catch {
    // localStorage 비활성 환경 안전 폴백
  }
  return next;
}
