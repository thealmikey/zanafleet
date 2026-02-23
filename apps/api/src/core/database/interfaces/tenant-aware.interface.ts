/**
 * Tenant-Aware Interface
 * 
 * All tenant-scoped entities MUST implement this interface.
 * Ensures entities have a workspaceId column for tenant isolation.
 * 
 * Usage:
 * ```typescript
 * @Entity('orders')
 * export class OrderEntity implements TenantAware {
 *   @Column('uuid')
 *   workspaceId!: string;
 * }
 * ```
 */
export interface TenantAware {
  /** The workspace/tenant this entity belongs to */
  workspaceId: string;
}

/**
 * Business-Scoped Interface
 * 
 * For entities that can be scoped by businessId (which maps to workspace).
 * Used as a transitional pattern before adding direct workspaceId.
 */
export interface BusinessScoped {
  /** The business this entity belongs to */
  businessId: string;
}

/**
 * Owner-Scoped Interface
 * 
 * For entities owned by actors (wallets, transactions, etc.)
 */
export interface OwnerScoped {
  /** The owner of this entity (actorId) */
  ownerId: string;
}