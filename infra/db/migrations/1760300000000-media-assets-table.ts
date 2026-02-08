import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class MediaAssetsTable1760300000000 implements MigrationInterface {
  name = 'MediaAssetsTable1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'media_assets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'filename', type: 'varchar', length: '255', isNullable: false },
          { name: 'mimeType', type: 'varchar', length: '127', isNullable: false },
          { name: 'size', type: 'bigint', isNullable: false },
          { name: 'checksum', type: 'varchar', length: '64', isNullable: false },
          { name: 'ownerId', type: 'uuid', isNullable: false },
          { name: 'ownerType', type: 'varchar', length: '32', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false },
          { name: 'storageKey', type: 'varchar', length: '512', isNullable: false },
          { name: 'storageProviderId', type: 'varchar', length: '64', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'archivedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'deletedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IDX_media_assets_owner_id',
        columnNames: ['ownerId'],
      }),
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IDX_media_assets_owner_type',
        columnNames: ['ownerType'],
      }),
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IDX_media_assets_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'media_assets',
      new TableIndex({
        name: 'IDX_media_assets_created_at',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('media_assets', 'IDX_media_assets_created_at');
    await queryRunner.dropIndex('media_assets', 'IDX_media_assets_status');
    await queryRunner.dropIndex('media_assets', 'IDX_media_assets_owner_type');
    await queryRunner.dropIndex('media_assets', 'IDX_media_assets_owner_id');
    await queryRunner.dropTable('media_assets', true);
  }
}
