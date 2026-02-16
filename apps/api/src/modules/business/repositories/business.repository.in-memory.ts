/**
 * In-Memory Business Repository
 *
 * In-memory implementation for sandbox mode.
 * Provides data access for business lookups without PostgreSQL.
 */

import { Injectable } from '@nestjs/common';
import { BusinessType } from '@zanafleet/contracts';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { BusinessEntity } from '../entities/business.entity';

/**
 * In-Memory Business Repository
 *
 * Provides in-memory data access for business lookups.
 * This is used when running in sandbox mode with USE_IN_MEMORY_DB=true.
 */
@Injectable()
export class BusinessRepositoryInMemory {
  /**
   * Store for businesses
   */
  private readonly store: InMemoryStoreBase<BusinessEntity>;

  constructor() {
    this.store = new InMemoryStoreBase<BusinessEntity>({
      entityName: 'Business',
      autoGenerateIds: false,
    });
  }

  /**
   * Find business by ID
   */
  async findById(id: string): Promise<BusinessEntity | null> {
    return this.store.findById(id);
  }

  /**
   * Find business by phone
   */
  async findByPhone(phone: string): Promise<BusinessEntity | null> {
    const all = await this.store.findAll();
    return all.find((b) => b.phone === phone) || null;
  }

  /**
   * Find all businesses
   */
  async findAll(): Promise<BusinessEntity[]> {
    return this.store.findAll();
  }

  /**
   * Find businesses by type
   */
  async findByType(businessType: BusinessType): Promise<BusinessEntity[]> {
    const all = await this.store.findAll();
    return all.filter((b) => b.businessType === businessType);
  }

  /**
   * Find businesses by IDs
   */
  async findByIds(ids: string[]): Promise<BusinessEntity[]> {
    return this.store.findByIds(ids);
  }

  /**
   * Save a business
   */
  async save(entity: BusinessEntity): Promise<BusinessEntity> {
    return this.store.save(entity);
  }

  /**
   * Save multiple businesses
   */
  async saveMany(entities: BusinessEntity[]): Promise<BusinessEntity[]> {
    return this.store.saveMany(entities);
  }

  /**
   * Update a business
   */
  async update(id: string, data: Partial<BusinessEntity>): Promise<BusinessEntity | null> {
    return this.store.update(id, data);
  }

  /**
   * Delete a business
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear all businesses
   */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Count total businesses
   */
  async count(): Promise<number> {
    return this.store.count();
  }

  /**
   * Seed businesses for testing
   */
  async seed(businesses: BusinessEntity[]): Promise<void> {
    await this.store.seed(businesses);
  }
}
