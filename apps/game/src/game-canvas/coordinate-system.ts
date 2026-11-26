/**
 * 좌표 변환 모듈 (GR-002)
 *
 * 단일 모듈에서 모든 좌표 변환을 관리합니다.
 * UI 컴포넌트마다 서로 다른 좌표 계산식을 사용하지 않습니다.
 */

export interface ViewportState {
  /** 캔버스 표시 너비 (픽셀) */
  canvasWidth: number;
  /** 캔버스 표시 높이 (픽셀) */
  canvasHeight: number;
  /** 카메라 월드 좌표 X (좌상단) */
  cameraX: number;
  /** 카메라 월드 좌표 Y (좌상단) */
  cameraY: number;
  /** 확대/축소 비율 (1.0 = 100%) */
  zoom: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface GridPoint {
  x: number;
  y: number;
}

/**
 * 화면 좌표(픽셀) → 월드 좌표
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
): WorldPoint {
  return {
    x: viewport.cameraX + screenX / viewport.zoom,
    y: viewport.cameraY + screenY / viewport.zoom,
  };
}

/**
 * 월드 좌표 → 화면 좌표(픽셀)
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportState,
): { x: number; y: number } {
  return {
    x: (worldX - viewport.cameraX) * viewport.zoom,
    y: (worldY - viewport.cameraY) * viewport.zoom,
  };
}

/**
 * 월드 좌표 → 격자 좌표 (반올림 스냅)
 */
export function worldToGrid(
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
 * 격자 좌표 → 월드 좌표
 */
export function gridToWorld(
  gridX: number,
  gridY: number,
  cellSize: number,
): WorldPoint {
  return {
    x: gridX * cellSize,
    y: gridY * cellSize,
  };
}

/**
 * 화면 좌표 → 격자 좌표 (한 번에 변환)
 */
export function screenToGrid(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  cellSize: number,
): GridPoint {
  const world = screenToWorld(screenX, screenY, viewport);
  return worldToGrid(world.x, world.y, cellSize);
}

/**
 * 스냅 반경 내 가장 가까운 격자 포인트 탐색 (GR-003)
 *
 * @param worldX - 월드 좌표 X
 * @param worldY - 월드 좌표 Y
 * @param cellSize - 격자 셀 크기
 * @param snapRadiusWorld - 월드 좌표 기준 스냅 반경
 * @returns 스냅된 격자 좌표 또는 null (반경 밖)
 */
export function snapToNearestGrid(
  worldX: number,
  worldY: number,
  cellSize: number,
  snapRadiusWorld: number,
): GridPoint | null {
  const nearestGrid = worldToGrid(worldX, worldY, cellSize);
  const nearestWorld = gridToWorld(nearestGrid.x, nearestGrid.y, cellSize);

  const dx = worldX - nearestWorld.x;
  const dy = worldY - nearestWorld.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= snapRadiusWorld) {
    return nearestGrid;
  }

  return null;
}

/**
 * 화면 확대율을 고려한 스냅 반경 계산
 *
 * @param baseSnapRadiusPixels - 기본 스냅 반경 (화면 픽셀)
 * @param zoom - 현재 확대율
 * @returns 월드 좌표 기준 스냅 반경
 */
export function calculateSnapRadius(
  baseSnapRadiusPixels: number,
  zoom: number,
): number {
  return baseSnapRadiusPixels / zoom;
}
