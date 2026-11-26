export {
  MatterBridgeEngine,
  computeInitialTruckSpawn,
} from './matter-bridge-engine.js';
export type {
  MatterBridgeEngineOptions,
  InitialTruckSpawn,
} from './matter-bridge-engine.js';
export type { BridgeSimulationEngine } from './engine-interface.js';
export { SimulationTruck, DEFAULT_TRUCK_CONFIG } from './truck.js';
export type { TruckConfig } from './truck.js';
export { FailureDetector, DEFAULT_THRESHOLDS } from './failure-detector.js';
export type { DisplacementThresholds } from './failure-detector.js';
export { ReplayBuffer } from './replay-buffer.js';
