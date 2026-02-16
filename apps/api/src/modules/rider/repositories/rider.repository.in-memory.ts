/**
 * In-Memory Rider Repository
 *
 * In-memory implementation for sandbox mode.
 * Provides data access for rider lookups without PostgreSQL.
 */

import { Injectable } from '@nestjs/common';
import { VehicleType } from '@zanafleet/contracts';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { RiderEntity } from '../entities/rider.entity';

/**
 * In-Memory Rider Repository
 *
 * Provides in-memory data access for rider lookups.
 * This is used when running in sandbox mode with USE_IN_MEMORY_DB=true.
 */
@Injectable()
export class RiderRepositoryInMemory {
  /**
   * Store for riders
   */
  private readonly store: InMemoryStoreBase<RiderEntity>;

  constructor() {
    this.store = new InMemoryStoreBase<RiderEntity>({
      entityName: 'Rider',
      autoGenerateIds: false,
    });
  }

  /**
   * Find rider by ID
   */
  async findById(id: string): Promise<RiderEntity | null> {
    return this.store.findById(id);
  }

  /**
   * Find rider by phone
   */
  async findByPhone(phone: string): Promise<RiderEntity | null> {
    const all = await this.store.findAll();
    return all.find((r) => r.phone === phone) || null;
  }

  /**
   * Find rider by national ID
   */
  async findByNationalId(nationalId: string): Promise<RiderEntity | null> {
    const all = await this.store.findAll();
    return all.find((r) => r.nationalId === nationalId) || null;
  }

  /**
   * Find riders by sacco ID
   */
  async findBySaccoId(saccoId: string): Promise<RiderEntity[]> {
    const all = await this.store.findAll();
    return all.filter((r) => r.saccoId === saccoId);
  }

  /**
   * Find riders by vehicle type
   */
  async findByVehicleType(vehicleType: VehicleType): Promise<RiderEntity[]> {
    const all = await this.store.findAll();
    return all.filter((r) => r.vehicleType === vehicleType);
  }

  /**
   * Find all riders
   */
  async findAll(): Promise<RiderEntity[]> {
    return this.store.findAll();
  }

  /**
   * Find riders by IDs
   */
  async findByIds(ids: string[]): Promise<RiderEntity[]> {
    return this.store.findByIds(ids);
  }

  /**
   * Save a rider
   */
  async save(entity: RiderEntity): Promise<RiderEntity> {
    return this.store.save(entity);
  }

  /**
   * Save multiple riders
   */
  async saveMany(entities: RiderEntity[]): Promise<RiderEntity[]> {
    return this.store.saveMany(entities);
  }

  /**
   * Update a rider
   */
  async update(id: string, data: Partial<RiderEntity>): Promise<RiderEntity | null> {
    return this.store.update(id, data);
  }

  /**
   * Delete a rider
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear all riders
   */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Count total riders
   */
  async count(): Promise<number> {
    return this.store.count();
  }

  /**
   * Seed riders for testing
   */
  async seed(riders: RiderEntity[]): Promise<void> {
    await this.store.seed(riders);
  }
}
