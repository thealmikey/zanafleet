import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * WooCommerce API Key Entity
 * 
 * Stores API keys for WooCommerce integration with Keycloak-backed authentication.
 * Key values are hashed using SHA-256 for security.
 */
@Entity('woocommerce_api_keys')
export class WooCommerceApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: string | null = null;

  @Column({ name: 'store_id' })
  storeId!: string;

  @Column({ name: 'key_hash', unique: true })
  keyHash!: string;

  @Column({ name: 'key_prefix' })
  keyPrefix!: string;

  @Column({ name: 'api_secret' })
  apiSecret!: string;

  @Column()
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null = null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
