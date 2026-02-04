import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateOrdersTable1760000000000 implements MigrationInterface {
  name = 'CreateOrdersTable1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'businessId', type: 'uuid', isNullable: false },
          { name: 'deliveryId', type: 'uuid', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enumName: 'order_status_enum',
            enum: ['Pending', 'Confirmed', 'Fulfilled', 'Cancelled'],
            isNullable: false,
          },
          { name: 'customerName', type: 'varchar', length: '255', isNullable: true },
          { name: 'customerPhone', type: 'varchar', length: '20', isNullable: true },
          { name: 'itemSummary', type: 'varchar', length: '255', isNullable: true },
          { name: 'itemMetadata', type: 'jsonb', isNullable: true },
          { name: 'scheduledTime', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_business_id',
        columnNames: ['businessId'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_scheduled_time',
        columnNames: ['scheduledTime'],
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_orders_business_id',
        columnNames: ['businessId'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        name: 'FK_orders_delivery_id',
        columnNames: ['deliveryId'],
        referencedTableName: 'deliveries',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('orders', 'FK_orders_delivery_id');
    await queryRunner.dropForeignKey('orders', 'FK_orders_business_id');

    await queryRunner.dropIndex('orders', 'IDX_orders_scheduled_time');
    await queryRunner.dropIndex('orders', 'IDX_orders_status');
    await queryRunner.dropIndex('orders', 'IDX_orders_business_id');

    await queryRunner.dropTable('orders');

    await queryRunner.query('DROP TYPE IF EXISTS "order_status_enum"');
  }
}
