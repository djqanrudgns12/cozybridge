// ──────────────────────────────────────────────
// @linebound/domain — Public API
// ──────────────────────────────────────────────

// 타입
export * from './types/index.js';

// 격자 수학
export {
  calculateDistance,
  snapToGrid,
  gridToWorld,
  isValidGridPoint,
} from './grid/grid-math.js';

// 비용 계산
export {
  calculateMemberCost,
  calculateTotalCost,
  calculateRemainingBudget,
  isBudgetExceeded,
} from './cost/cost-calculator.js';

// 연결 검증
export {
  validateConnection,
  DEFAULT_MAX_MEMBER_LENGTH,
  type ValidationResult,
  type ValidationError,
} from './validation/connection-validator.js';

// 설계 관리
export {
  createDesign,
  addNode,
  removeNode,
  addMember,
  removeMember,
  getOrCreateNode,
  type CreateDesignParams,
  type AddNodeResult,
  type RemoveNodeResult,
  type AddMemberResult,
} from './design/design-manager.js';

// 시뮬레이션 상태 머신
export {
  createSimulationContext,
  canTransition,
  transition,
  type SimulationContext,
} from './simulation/simulation-state-machine.js';
