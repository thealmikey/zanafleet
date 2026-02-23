import { OrderStatus, PaymentStatus } from '@zanafleet/contracts';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';


@Entity('orders')
@Index(['businessId'])
@Index(['workspaceId'])
@Index(['status'])
@Index(['scheduledTime'])
export class OrderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid', { nullable: true })
  deliveryId: string | null = null;

  @Column('enum', { enum: OrderStatus })
  status!: OrderStatus;

  @Column('varchar', { length: 255, nullable: true })
  customerName: string | null = null;

  @Column('varchar', { length: 20, nullable: true })
  customerPhone: string | null = null;

  @Column('uuid', { nullable: true })
  customerId: string | null = null;

  @Column('varchar', { length: 255, nullable: true })
  itemSummary: string | null = null;

  @Column('jsonb', { nullable: true })
  itemMetadata: Record<string, unknown> | null = null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledTime: Date | null = null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  totalAmount: number | null = null;

  @Column('varchar', { length: 10, nullable: true })
  currency: string | null = null;

  @Column('enum', { enum: PaymentStatus, default: PaymentStatus.Pending })
  paymentStatus!: PaymentStatus;

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
    customerId: string | null;
    scheduledTime: Date | null;
    status: OrderStatus;
    totalAmount: number | null;
    currency: string | null;
    paymentStatus: PaymentStatus;
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
      customerId: this.customerId ?? null,
      scheduledTime: this.scheduledTime ?? null,
      status: this.status,
      totalAmount: this.totalAmount ? Number(this.totalAmount) : null,
      currency: this.currency,
      paymentStatus: this.paymentStatus,
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
    customerId?: string | null;
    scheduledTime?: Date | null;
    status: OrderStatus;
    totalAmount?: number | null;
    currency?: string | null;
    paymentStatus?: PaymentStatus;
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
    entity.customerId = data.customerId ?? null;
    entity.scheduledTime = data.scheduledTime ?? null;
    entity.status = data.status;
    entity.totalAmount = data.totalAmount ?? null;
    entity.currency = data.currency ?? null;
    entity.paymentStatus = data.paymentStatus ?? PaymentStatus.Pending;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
