// ──────────────────────────────────────────────
// 격자 수학 단위 테스트
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  snapToGrid,
  gridToWorld,
  isValidGridPoint,
} from '../grid/grid-math.js';
import type { GridConfig, GridPoint } from '../types/index.js';

describe('calculateDistance', () => {
  it('수평 거리를 정확히 계산한다', () => {
    const a: GridPoint = { x: 0, y: 0 };
    const b: GridPoint = { x: 3, y: 0 };
    expect(calculateDistance(a, b)).toBe(3);
  });

  it('수직 거리를 정확히 계산한다', () => {
    const a: GridPoint = { x: 0, y: 0 };
    const b: GridPoint = { x: 0, y: 4 };
    expect(calculateDistance(a, b)).toBe(4);
  });

  it('대각선 거리를 정확히 계산한다 (3-4-5 삼각형)', () => {
    const a: GridPoint = { x: 0, y: 0 };
    const b: GridPoint = { x: 3, y: 4 };
    expect(calculateDistance(a, b)).toBe(5);
  });

  it('같은 점은 거리 0', () => {
    const a: GridPoint = { x: 5, y: 5 };
    expect(calculateDistance(a, a)).toBe(0);
  });

  it('음수 좌표도 올바르게 처리한다', () => {
    const a: GridPoint = { x: -1, y: -1 };
    const b: GridPoint = { x: 2, y: 3 };
    expect(calculateDistance(a, b)).toBe(5);
  });
});

describe('snapToGrid', () => {
  it('정확한 격자 위치는 그대로 반환한다', () => {
    expect(snapToGrid(100, 200, 50)).toEqual({ x: 2, y: 4 });
  });

  it('격자 사이 좌표를 가장 가까운 격자로 스냅한다', () => {
    expect(snapToGrid(130, 220, 50)).toEqual({ x: 3, y: 4 });
  });

  it('정확히 중간(0.5)이면 반올림한다', () => {
    expect(snapToGrid(125, 175, 50)).toEqual({ x: 3, y: 4 });
  });

  it('cellSize=1이면 반올림된 정수 좌표를 반환한다', () => {
    expect(snapToGrid(2.3, 4.7, 1)).toEqual({ x: 2, y: 5 });
  });
});

describe('gridToWorld', () => {
  it('격자 좌표를 월드 좌표로 변환한다', () => {
    expect(gridToWorld({ x: 2, y: 3 }, 50)).toEqual({ x: 100, y: 150 });
  });

  it('원점은 (0, 0)이다', () => {
    expect(gridToWorld({ x: 0, y: 0 }, 50)).toEqual({ x: 0, y: 0 });
  });
});

describe('isValidGridPoint', () => {
  const config: GridConfig = { width: 10, height: 8, cellSize: 50 };

  it('범위 안의 점은 유효하다', () => {
    expect(isValidGridPoint({ x: 5, y: 4 }, config)).toBe(true);
  });

  it('(0, 0)은 유효하다', () => {
    expect(isValidGridPoint({ x: 0, y: 0 }, config)).toBe(true);
  });

  it('(width, height)은 유효하다 (경계 포함)', () => {
    expect(isValidGridPoint({ x: 10, y: 8 }, config)).toBe(true);
  });

  it('음수 좌표는 무효하다', () => {
    expect(isValidGridPoint({ x: -1, y: 3 }, config)).toBe(false);
  });

  it('격자 범위를 초과하면 무효하다', () => {
    expect(isValidGridPoint({ x: 11, y: 3 }, config)).toBe(false);
  });

  it('정수가 아닌 좌표는 무효하다', () => {
    expect(isValidGridPoint({ x: 1.5, y: 3 }, config)).toBe(false);
  });
});
