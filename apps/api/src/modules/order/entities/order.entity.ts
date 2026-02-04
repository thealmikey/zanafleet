import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

import { OrderStatus } from '@zanafleet/contracts';

@Entity('orders')
@Index(['businessId'])
@Index(['status'])
@Index(['scheduledTime'])
export class OrderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid', { nullable: true })
  deliveryId: string | null = null;

  @Column('enum', { enum: OrderStatus })
  status!: OrderStatus;

  @Column('varchar', { length: 255, nullable: true })
  customerName: string | null = null;

  @Column('varchar', { length: 20, nullable: true })
  customerPhone: string | null = null;

  @Column('varchar', { length: 255, nullable: true })
  itemSummary: string | null = null;

  @Column('jsonb', { nullable: true })
  itemMetadata: Record<string, unknown> | null = null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledTime: Date | null = null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    orderId: string;
    businessId: string;
    deliveryId: string | null;
    itemSummary: string | null;
    itemMetadata: Record<string, unknown> | null;
    customerName: string | null;
    customerPhone: string | null;
    scheduledTime: Date | null;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      orderId: this.id,
      businessId: this.businessId,
      deliveryId: this.deliveryId ?? null,
      itemSummary: this.itemSummary ?? null,
      itemMetadata: this.itemMetadata ?? null,
      customerName: this.customerName ?? null,
      customerPhone: this.customerPhone ?? null,
      scheduledTime: this.scheduledTime ?? null,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    orderId: string;
    businessId: string;
    deliveryId?: string | null;
    itemSummary?: string | null;
    itemMetadata?: Record<string, unknown> | null;
    customerName?: string | null;
    customerPhone?: string | null;
    scheduledTime?: Date | null;
    status: OrderStatus;
    createdAt: Date;
  }): OrderEntity {
    const entity = new OrderEntity();
    entity.id = data.orderId;
    entity.businessId = data.businessId;
    entity.deliveryId = data.deliveryId ?? null;
    entity.itemSummary = data.itemSummary ?? null;
    entity.itemMetadata = data.itemMetadata ?? null;
    entity.customerName = data.customerName ?? null;
    entity.customerPhone = data.customerPhone ?? null;
    entity.scheduledTime = data.scheduledTime ?? null;
    entity.status = data.status;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
