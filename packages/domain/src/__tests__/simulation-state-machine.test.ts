// ──────────────────────────────────────────────
// 시뮬레이션 상태 머신 단위 테스트
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  createSimulationContext,
  canTransition,
  transition,
} from '../simulation/simulation-state-machine.js';
import type { SimulationStatus } from '../types/simulation.js';

describe('createSimulationContext', () => {
  it('idle 상태의 컨텍스트를 생성한다', () => {
    const ctx = createSimulationContext();
    expect(ctx.status).toBe('idle');
    expect(ctx.startedAt).toBeNull();
  });
});

describe('canTransition', () => {
  /** 허용되는 전이 목록 */
  const validTransitions: [SimulationStatus, SimulationStatus][] = [
    ['idle', 'validating'],
    ['validating', 'ready'],
    ['validating', 'error'],
    ['ready', 'running'],
    ['running', 'success'],
    ['running', 'failure'],
    ['running', 'paused'],
    ['running', 'error'],
    ['failure', 'replaying'],
    ['replaying', 'idle'],
    ['paused', 'running'],
    ['paused', 'idle'],
    ['success', 'idle'],
    ['error', 'idle'],
  ];

  it.each(validTransitions)(
    '%s → %s 전이를 허용한다',
    (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    },
  );

  /** 허용되지 않는 전이 목록 */
  const invalidTransitions: [SimulationStatus, SimulationStatus][] = [
    ['idle', 'running'],
    ['idle', 'success'],
    ['idle', 'failure'],
    ['validating', 'running'],
    ['validating', 'failure'],
    ['ready', 'idle'],
    ['ready', 'failure'],
    ['running', 'validating'],
    ['running', 'ready'],
    ['success', 'running'],
    ['failure', 'running'],
    ['replaying', 'running'],
    ['error', 'running'],
  ];

  it.each(invalidTransitions)(
    '%s → %s 전이를 거부한다',
    (from, to) => {
      expect(canTransition(from, to)).toBe(false);
    },
  );
});

describe('transition', () => {
  it('유효한 전이 시 새 컨텍스트를 반환한다', () => {
    const ctx = createSimulationContext();
    const result = transition(ctx, 'validating');
    expect(result).not.toBeInstanceOf(Error);
    if (result instanceof Error) return;
    expect(result.status).toBe('validating');
  });

  it('idle → validating → ready → running 체인이 동작한다', () => {
    let ctx = createSimulationContext();

    let result = transition(ctx, 'validating');
    expect(result).not.toBeInstanceOf(Error);
    ctx = result as ReturnType<typeof createSimulationContext>;

    result = transition(ctx, 'ready');
    expect(result).not.toBeInstanceOf(Error);
    ctx = result as ReturnType<typeof createSimulationContext>;

    result = transition(ctx, 'running');
    expect(result).not.toBeInstanceOf(Error);
    ctx = result as ReturnType<typeof createSimulationContext>;

    expect(ctx.status).toBe('running');
    expect(ctx.startedAt).not.toBeNull();
  });

  it('무효한 전이 시 Error를 반환한다', () => {
    const ctx = createSimulationContext();
    const result = transition(ctx, 'running');
    expect(result).toBeInstanceOf(Error);
  });

  it('running → success → idle 체인이 동작한다', () => {
    let ctx = createSimulationContext();
    ctx = transition(ctx, 'validating') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'ready') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'running') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'success') as ReturnType<typeof createSimulationContext>;
    const result = transition(ctx, 'idle');
    expect(result).not.toBeInstanceOf(Error);
    if (result instanceof Error) return;
    expect(result.status).toBe('idle');
  });

  it('running → failure → replaying → idle 체인이 동작한다', () => {
    let ctx = createSimulationContext();
    ctx = transition(ctx, 'validating') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'ready') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'running') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'failure') as ReturnType<typeof createSimulationContext>;
    ctx = transition(ctx, 'replaying') as ReturnType<typeof createSimulationContext>;
    const result = transition(ctx, 'idle');
    expect(result).not.toBeInstanceOf(Error);
    if (result instanceof Error) return;
    expect(result.status).toBe('idle');
  });
});
