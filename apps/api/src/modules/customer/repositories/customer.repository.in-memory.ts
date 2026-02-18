/**
 * In-Memory Customer Repository
 *
 * In-memory implementation for sandbox mode.
 * Provides data access for customer lookups without PostgreSQL.
 * Implements TypeORM-compatible interface for seamless integration.
 */

import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { CustomerEntity } from '../entities/customer.entity';

/**
 * In-Memory Customer Repository
 *
 * Provides in-memory data access for customer lookups.
 * This is used when running in sandbox mode with USE_IN_MEMORY_DB=true.
 * Implements TypeORM-compatible interface.
 */
@Injectable()
export class CustomerRepositoryInMemory {
  /**
   * Store for customers
   */
  private readonly store: InMemoryStoreBase<CustomerEntity>;

  constructor() {
    this.store = new InMemoryStoreBase<CustomerEntity>({
      entityName: 'Customer',
      autoGenerateIds: false,
    });
  }

  /**
   * Find one customer by query options (TypeORM-compatible)
   */
  async findOne(options: { where: { businessId?: string; phoneNumber?: string; id?: string } }): Promise<CustomerEntity | null> {
    const { where } = options;
    const all = await this.store.findAll();
    
    if (where.id) {
      return all.find((c) => c.id === where.id) || null;
    }
    if (where.businessId && where.phoneNumber) {
      return all.find((c) => c.businessId === where.businessId && c.phoneNumber === where.phoneNumber) || null;
    }
    if (where.businessId) {
      return all.find((c) => c.businessId === where.businessId) || null;
    }
    if (where.phoneNumber) {
      return all.find((c) => c.phoneNumber === where.phoneNumber) || null;
    }
    return null;
  }

  /**
   * Find customer by ID (TypeORM-compatible)
   */
  async findOneById(id: string): Promise<CustomerEntity | null> {
    return this.store.findById(id);
  }

  /**
   * Find customer by phone number and business (TypeORM-compatible)
   */
  async findOneByPhone(phoneNumber: string, businessId: string): Promise<CustomerEntity | null> {
    const all = await this.store.findAll();
    return all.find((c) => c.phoneNumber === phoneNumber && c.businessId === businessId) || null;
  }

  /**
   * Find all customers (TypeORM-compatible)
   */
  async find(): Promise<CustomerEntity[]> {
    return this.store.findAll();
  }

  /**
   * Find all customers
   */
  async findAll(): Promise<CustomerEntity[]> {
    return this.store.findAll();
  }

  /**
   * Find customers by business ID
   */
  async findByBusinessId(businessId: string): Promise<CustomerEntity[]> {
    const all = await this.store.findAll();
    return all.filter((c) => c.businessId === businessId);
  }

  /**
   * Find customers by IDs
   */
  async findByIds(ids: string[]): Promise<CustomerEntity[]> {
    return this.store.findByIds(ids);
  }

  /**
   * Create a new entity (TypeORM-compatible)
   */
  create(partial: DeepPartial<CustomerEntity>): CustomerEntity {
    const entity = new CustomerEntity();
    Object.assign(entity, partial);
    return entity;
  }

  /**
   * Save an entity (TypeORM-compatible)
   */
  async save(entity: CustomerEntity): Promise<CustomerEntity> {
    return this.store.save(entity);
  }

  /**
   * Save multiple customers
   */
  async saveMany(entities: CustomerEntity[]): Promise<CustomerEntity[]> {
    return this.store.saveMany(entities);
  }

  /**
   * Update a customer
   */
  async update(id: string, data: Partial<CustomerEntity>): Promise<CustomerEntity | null> {
    return this.store.update(id, data);
  }

  /**
   * Delete a customer
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear all customers
   */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Count total customers
   */
  async count(): Promise<number> {
    return this.store.count();
  }

  /**
   * Seed customers for testing
   */
  async seed(customers: CustomerEntity[]): Promise<void> {
    await this.store.seed(customers);
  }
}
