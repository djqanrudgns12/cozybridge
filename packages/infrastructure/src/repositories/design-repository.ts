import type {
  BridgeDesign,
  BridgeVersion,
  EntityId,
} from '@linebound/domain';
import {
  LineboundDatabase,
  toDesignRecord,
  fromDesignRecord,
  type BridgeVersionRecord,
} from '../db/linebound-db.js';

export interface IDesignRepository {
  save(design: BridgeDesign): Promise<void>;
  findById(id: EntityId): Promise<BridgeDesign | null>;
  findByLevelId(levelId: EntityId): Promise<BridgeDesign[]>;
  getAll(): Promise<BridgeDesign[]>;
  delete(id: EntityId): Promise<void>;

  saveVersion(version: BridgeVersion): Promise<void>;
  getVersionsByDesignId(designId: EntityId): Promise<BridgeVersion[]>;
}

export class IndexedDbDesignRepository implements IDesignRepository {
  constructor(private db: LineboundDatabase) {}

  async save(design: BridgeDesign): Promise<void> {
    const record = toDesignRecord(design);
    await this.db.designs.put(record);
  }

  async findById(id: EntityId): Promise<BridgeDesign | null> {
    const record = await this.db.designs.get(id);
    if (!record) return null;
    return fromDesignRecord(record);
  }

  async findByLevelId(levelId: EntityId): Promise<BridgeDesign[]> {
    const records = await this.db.designs.where('levelId').equals(levelId).toArray();
    return records.map(fromDesignRecord);
  }

  async getAll(): Promise<BridgeDesign[]> {
    const records = await this.db.designs.orderBy('updatedAt').reverse().toArray();
    return records.map(fromDesignRecord);
  }

  async delete(id: EntityId): Promise<void> {
    await this.db.transaction('rw', this.db.designs, this.db.versions, async () => {
      await this.db.designs.delete(id);
      await this.db.versions.where('designId').equals(id).delete();
    });
  }

  async saveVersion(version: BridgeVersion): Promise<void> {
    const record: BridgeVersionRecord = {
      id: version.id,
      designId: version.designId,
      versionNumber: version.versionNumber,
      snapshot: JSON.stringify(toDesignRecord(version.snapshot)),
      createdAt: version.createdAt,
      parentVersionId: version.parentVersionId,
    };
    await this.db.versions.put(record);
  }

  async getVersionsByDesignId(designId: EntityId): Promise<BridgeVersion[]> {
    const records = await this.db.versions
      .where('designId')
      .equals(designId)
      .sortBy('versionNumber');

    return records.map((r) => ({
      id: r.id,
      designId: r.designId,
      versionNumber: r.versionNumber,
      snapshot: fromDesignRecord(JSON.parse(r.snapshot)),
      createdAt: r.createdAt,
      parentVersionId: r.parentVersionId,
    }));
  }
}
