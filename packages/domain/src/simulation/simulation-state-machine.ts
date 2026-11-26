// ──────────────────────────────────────────────
// 시뮬레이션 상태 머신
// ──────────────────────────────────────────────

import type { SimulationStatus } from '../types/simulation.js';

/** 시뮬레이션 컨텍스트 */
export interface SimulationContext {
  readonly status: SimulationStatus;
  readonly startedAt: number | null;
  readonly updatedAt: number;
}

/**
 * 허용되는 상태 전이 맵
 *
 * idle → validating
 * validating → ready | error
 * ready → running
 * running → success | failure | paused | error
 * failure → replaying
 * replaying → idle
 * paused → running | idle
 * success → idle
 * error → idle
 */
const ALLOWED_TRANSITIONS: ReadonlyMap<SimulationStatus, ReadonlySet<SimulationStatus>> =
  new Map([
    ['idle', new Set<SimulationStatus>(['validating'])],
    ['validating', new Set<SimulationStatus>(['ready', 'error'])],
    ['ready', new Set<SimulationStatus>(['running'])],
    ['running', new Set<SimulationStatus>(['success', 'failure', 'paused', 'error'])],
    ['failure', new Set<SimulationStatus>(['replaying'])],
    ['replaying', new Set<SimulationStatus>(['idle'])],
    ['paused', new Set<SimulationStatus>(['running', 'idle'])],
    ['success', new Set<SimulationStatus>(['idle'])],
    ['error', new Set<SimulationStatus>(['idle'])],
  ]);

/**
 * 초기 시뮬레이션 컨텍스트를 생성한다.
 */
export function createSimulationContext(): SimulationContext {
  return {
    status: 'idle',
    startedAt: null,
    updatedAt: Date.now(),
  };
}

/**
 * 주어진 상태에서 다른 상태로 전이가 가능한지 확인한다.
 */
export function canTransition(
  from: SimulationStatus,
  to: SimulationStatus,
): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from);
  return allowed !== undefined && allowed.has(to);
}

/**
 * 상태 전이를 시도한다.
 * 허용되지 않는 전이일 경우 Error를 반환한다.
 */
export function transition(
  context: SimulationContext,
  to: SimulationStatus,
): SimulationContext | Error {
  if (!canTransition(context.status, to)) {
    return new Error(
      `허용되지 않는 상태 전이: ${context.status} → ${to}`,
    );
  }

  const now = Date.now();
  return {
    status: to,
    startedAt: to === 'running' && context.startedAt === null ? now : context.startedAt,
    updatedAt: now,
  };
}
