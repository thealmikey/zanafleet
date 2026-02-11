import { GeoJsonPoint } from '@api/core/utils/geo.utils';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'delivery_locations' })
@Index('IDX_delivery_locations_created_at', ['createdAt'])
export class DeliveryLocationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('double precision')
  latitude!: number;

  @Column('double precision')
  longitude!: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point!: GeoJsonPoint;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'CUSTOMER_PIN' })
  source!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
