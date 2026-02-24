import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('customers')
@Index(['businessId'])
@Index(['workspaceId'])
@Index(['phoneNumber'])
export class CustomerEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('varchar', { length: 20 })
  phoneNumber!: string;

  @Column('varchar', { length: 255, nullable: true })
  email: string | null = null;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown> | null = null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
