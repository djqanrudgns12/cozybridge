// ──────────────────────────────────────────────
// 레벨(Level) 관련 타입 정의
// ──────────────────────────────────────────────

import type { EntityId } from './common.js';

/** 격자 설정 */
export interface GridConfig {
  /** 격자 가로 셀 수 */
  readonly width: number;
  /** 격자 세로 셀 수 */
  readonly height: number;
  /** 셀 하나의 월드 픽셀 크기 */
  readonly cellSize: number;
}

/** 지형 경계를 구성하는 점 */
export interface TerrainPoint {
  readonly x: number;
  readonly y: number;
}

/** 앵커 (교각 지지점) */
export interface Anchor {
  readonly id: EntityId;
  readonly x: number;
  readonly y: number;
  /** fixed: 고정 지지, roller: 수평 이동 가능 */
  readonly type: 'fixed' | 'roller';
}

/** 트럭 이동 경로 점 */
export interface TruckPathPoint {
  readonly x: number;
  readonly y: number;
}

/** 잠금 해제 조건 */
export interface UnlockRequirement {
  readonly type: 'level_complete';
  readonly levelId: EntityId;
}

/** 레벨 정의 */
export interface LevelDefinition {
  readonly id: EntityId;
  readonly title: string;
  readonly description: string;
  /** 난이도 (1–5) */
  readonly difficulty: number;
  /** 예산 상한 */
  readonly budget: number;
  /** 부재 단위 비용 */
  readonly unitCost: number;
  /** 단일 부재 최대 허용 길이 (격자 셀 단위, 미지정 시 제한 없음) */
  readonly maxMemberLength?: number;
  readonly gridConfig: GridConfig;
  readonly terrain: readonly TerrainPoint[];
  readonly anchors: readonly Anchor[];
  readonly truckPath: readonly TruckPathPoint[];
  readonly unlockRequirements: readonly UnlockRequirement[];
  /** 콘텐츠 버전 — 레벨 데이터 변경 시 증가 */
  readonly contentVersion: number;
}
