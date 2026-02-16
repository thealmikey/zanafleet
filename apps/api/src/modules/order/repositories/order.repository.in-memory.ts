/**
 * In-Memory Order Repository
 *
 * In-memory implementation for sandbox mode.
 * Provides data access for order lookups without PostgreSQL.
 */

import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@zanafleet/contracts';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { OrderEntity } from '../entities/order.entity';

/**
 * In-Memory Order Repository
 *
 * Provides in-memory data access for order lookups.
 * This is used when running in sandbox mode with USE_IN_MEMORY_DB=true.
 */
@Injectable()
export class OrderRepositoryInMemory {
  /**
   * Store for orders
   */
  private readonly store: InMemoryStoreBase<OrderEntity>;

  constructor() {
    this.store = new InMemoryStoreBase<OrderEntity>({
      entityName: 'Order',
      autoGenerateIds: false,
    });
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<OrderEntity | null> {
    return this.store.findById(id);
  }

  /**
   * Find orders by business ID
   */
  async findByBusinessId(businessId: string): Promise<OrderEntity[]> {
    const all = await this.store.findAll();
    return all.filter((o) => o.businessId === businessId);
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: OrderStatus): Promise<OrderEntity[]> {
    const all = await this.store.findAll();
    return all.filter((o) => o.status === status);
  }

  /**
   * Find orders by delivery ID
   */
  async findByDeliveryId(deliveryId: string): Promise<OrderEntity[]> {
    const all = await this.store.findAll();
    return all.filter((o) => o.deliveryId === deliveryId);
  }

  /**
   * Find all orders
   */
  async findAll(): Promise<OrderEntity[]> {
    return this.store.findAll();
  }

  /**
   * Find orders by IDs
   */
  async findByIds(ids: string[]): Promise<OrderEntity[]> {
    return this.store.findByIds(ids);
  }

  /**
   * Save an order
   */
  async save(entity: OrderEntity): Promise<OrderEntity> {
    return this.store.save(entity);
  }

  /**
   * Save multiple orders
   */
  async saveMany(entities: OrderEntity[]): Promise<OrderEntity[]> {
    return this.store.saveMany(entities);
  }

  /**
   * Update an order
   */
  async update(id: string, data: Partial<OrderEntity>): Promise<OrderEntity | null> {
    return this.store.update(id, data);
  }

  /**
   * Delete an order
   */
  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  /**
   * Clear all orders
   */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Count total orders
   */
  async count(): Promise<number> {
    return this.store.count();
  }

  /**
   * Seed orders for testing
   */
  async seed(orders: OrderEntity[]): Promise<void> {
    await this.store.seed(orders);
  }
}
