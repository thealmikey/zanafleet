import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('market_density_projections')
@Index(['h3Index'])
export class MarketDensityProjection {
  @PrimaryColumn('varchar', { length: 20 })
  h3Index!: string; // H3 cell ID for spatial aggregation

  @Column('int', { default: 0 })
  activeOrderCount!: number;

  @Column('int', { default: 0 })
  totalOrderCount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalRevenue!: number;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
