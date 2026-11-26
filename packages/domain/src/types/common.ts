// ──────────────────────────────────────────────
// 공통 타입 정의
// ──────────────────────────────────────────────

/** 정수 격자 좌표 */
export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

/** 엔티티 고유 식별자 */
export type EntityId = string;

/** Unix epoch 밀리초 타임스탬프 */
export type Timestamp = number;

/** 데이터 스키마 버전 */
export type SchemaVersion = number;

/** 동기화 상태 */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

/** 설계 공개 범위 */
export type Visibility = 'private' | 'public';

/** 게임 모드 — stage: 예산 제한 스테이지, sandbox: 자유 건설, lesson: 초등 눈높이 다리 교실 */
export type GameMode = 'stage' | 'sandbox' | 'lesson';
