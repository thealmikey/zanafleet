import { Repository } from 'typeorm';
import { CustomerEntity } from '../entities/customer.entity';

/**
 * In-memory implementation of CustomerRepository for sandbox mode
 * Provides a simple in-memory store for testing without a real database
 */
export class CustomerRepositoryInMemory {
  private customers: Map<string, CustomerEntity> = new Map();

  async find(): Promise<CustomerEntity[]> {
    return Array.from(this.customers.values());
  }

  async findOne(id: string): Promise<CustomerEntity | null> {
    return this.customers.get(id) || null;
  }

  async findOneBy(conditions: Partial<CustomerEntity>): Promise<CustomerEntity | null> {
    const customer = Array.from(this.customers.values()).find((c) => {
      return Object.entries(conditions).every(
        ([key, value]) => c[key as keyof CustomerEntity] === value
      );
    });
    return customer || null;
  }

  async save(customer: CustomerEntity): Promise<CustomerEntity> {
    this.customers.set(customer.id, customer);
    return customer;
  }

  async create(data: Partial<CustomerEntity>): Promise<CustomerEntity> {
    const customer = new CustomerEntity();
    Object.assign(customer, data);
    return customer;
  }

  async delete(id: string | number): Promise<{ affected: number }> {
    const key = typeof id === 'string' ? id : String(id);
    const existed = this.customers.has(key);
    this.customers.delete(key);
    return { affected: existed ? 1 : 0 };
  }

  async createQueryBuilder(): ReturnType<Repository<CustomerEntity>['createQueryBuilder']> {
    // Return null for query builder in memory mode
    return null as unknown as ReturnType<Repository<CustomerEntity>['createQueryBuilder']>;
  }

  get manager() {
    return {
      save: async (entity: CustomerEntity): Promise<CustomerEntity> => this.save(entity),
    };
  }
}
