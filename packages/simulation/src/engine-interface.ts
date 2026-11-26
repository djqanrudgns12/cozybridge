import type {
  BridgeDesign,
  LevelDefinition,
  SimulationStatus,
  SimulationFrame,
  FailureReport,
} from '@linebound/domain';

/**
 * 다리 물리 시뮬레이션 엔진 인터페이스 (PRD 5.2)
 *
 * 물리 엔진의 구체적인 구현(Matter.js, Rapier 등)이 게임 로직 전체에
 * 노출되지 않도록 추상화된 인터페이스를 제공합니다.
 */
export interface BridgeSimulationEngine {
  /**
   * 주어진 설계와 레벨 환경으로 시뮬레이터를 초기화합니다.
   */
  initialize(design: BridgeDesign, level: LevelDefinition): SimulationStatus;

  /**
   * 시뮬레이션을 지정된 시간(초)만큼 1 스텝 진행합니다.
   * 고정 시간 단위(fixed timestep) 방식으로 운용됩니다.
   */
  step(deltaTime: number): SimulationFrame;

  /**
   * 현재 시뮬레이션 상태를 조회합니다.
   */
  getStatus(): SimulationStatus;

  /**
   * 스텝을 진행하지 않고 현재 시점의 시뮬레이션 프레임을 조회합니다.
   */
  getCurrentFrame(): SimulationFrame;

  /**
   * 실패 발생 시 실패 원인 분석 보고서를 조회합니다.
   */
  getFailureReport(): FailureReport | null;

  /**
   * 실패 순간 재생용 프레임 기록(슬로모션 버퍼)을 조회합니다.
   */
  getReplayFrames(): readonly SimulationFrame[];

  /**
   * 시뮬레이션을 초기 상태로 리셋합니다.
   */
  reset(): void;

  /**
   * 모든 물리 자원을 해제합니다.
   */
  dispose(): void;
}
