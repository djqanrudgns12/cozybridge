// ──────────────────────────────────────────────
// 격자 수학 유틸리티
// ──────────────────────────────────────────────

import type { GridConfig, GridPoint } from '../types/index.js';

/**
 * 두 격자 점 사이의 유클리드 거리를 계산한다.
 * 공식: sqrt((x2-x1)^2 + (y2-y1)^2)
 */
export function calculateDistance(a: GridPoint, b: GridPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 월드 좌표를 가장 가까운 격자 좌표로 스냅한다.
 * 반올림(Math.round)을 사용하여 가장 가까운 정수 격자 좌표를 반환.
 */
export function snapToGrid(
  worldX: number,
  worldY: number,
  cellSize: number,
): GridPoint {
  return {
    x: Math.round(worldX / cellSize),
    y: Math.round(worldY / cellSize),
  };
}

/**
 * 격자 좌표를 월드 좌표(픽셀)로 변환한다.
 */
export function gridToWorld(
  point: GridPoint,
  cellSize: number,
): { x: number; y: number } {
  return {
    x: point.x * cellSize,
    y: point.y * cellSize,
  };
}

/**
 * 격자 좌표가 유효한 범위(0 ~ width, 0 ~ height) 안에 있는지 검증한다.
 */
export function isValidGridPoint(
  point: GridPoint,
  config: GridConfig,
): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.x <= config.width &&
    point.y >= 0 &&
    point.y <= config.height
  );
}
