export {
  CozybridgeDatabase,
  resolveUserStorageScope,
  getScopedDatabaseName,
  getScopedDatabase,
  toDesignRecord,
  fromDesignRecord,
  toPublicDesignRecord,
  fromPublicDesignRecord,
} from './db/cozybridge-db.js';
export type {
  BridgeDesignRecord,
  BridgeVersionRecord,
  LevelProgressRecord,
  PublicDesignRecord,
} from './db/cozybridge-db.js';

export {
  IndexedDbDesignRepository,
} from './repositories/design-repository.js';
export type { IDesignRepository } from './repositories/design-repository.js';

export {
  IndexedDbLevelProgressRepository,
} from './repositories/level-progress-repository.js';
export type { ILevelProgressRepository } from './repositories/level-progress-repository.js';

export {
  IndexedDbSyncQueueRepository,
} from './repositories/sync-queue-repository.js';
export type { ISyncQueueRepository } from './repositories/sync-queue-repository.js';

export {
  CommunityRepository,
} from './repositories/community-repository.js';
export type { ICommunityRepository } from './repositories/community-repository.js';

export {
  LocalCurrencyRepository,
} from './repositories/currency-repository.js';
export type { ICurrencyRepository } from './repositories/currency-repository.js';

export {
  SupabaseAuthService,
} from './auth/auth-service.js';
export type {
  AuthServiceOptions,
  IAuthService,
  UserSession,
} from './auth/auth-service.js';

export {
  SyncManager,
} from './sync/sync-manager.js';
export type { SyncResult } from './sync/sync-manager.js';
