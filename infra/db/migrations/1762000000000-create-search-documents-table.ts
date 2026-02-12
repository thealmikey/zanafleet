import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSearchDocuments1762000000000 implements MigrationInterface {
    name = 'CreateSearchDocuments1762000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure required extensions are available
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gin"`);

        await queryRunner.query(`
      CREATE TABLE "search_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entityId" uuid NOT NULL,
        "entityType" varchar(32) NOT NULL,
        "workspaceId" uuid NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "metadata" jsonb DEFAULT '{}',
        "location" geometry(Point, 4326),
        "tsv" tsvector,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_search_documents" PRIMARY KEY ("id")
      )
    `);

        // Unique constraint: one search document per entity per workspace
        await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_search_documents_entity_workspace" 
      ON "search_documents" ("entityId", "entityType", "workspaceId")
    `);

        // Standard indexes
        await queryRunner.query(`CREATE INDEX "IDX_search_documents_entity_type" ON "search_documents" ("entityType")`);
        await queryRunner.query(`CREATE INDEX "IDX_search_documents_workspace_id" ON "search_documents" ("workspaceId")`);

        // Spatial index
        await queryRunner.query(`CREATE INDEX "IDX_search_documents_location" ON "search_documents" USING GIST ("location")`);

        // Full-Text Search index
        await queryRunner.query(`CREATE INDEX "IDX_search_documents_tsv" ON "search_documents" USING GIN ("tsv")`);

        // Trigger to update tsv column automatically
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_documents_tsvector_trigger() RETURNS trigger AS $$
      BEGIN
        new.tsv := setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
                   setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
        RETURN new;
      END
      $$ LANGUAGE plpgsql;
    `);

        await queryRunner.query(`
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON "search_documents" FOR EACH ROW EXECUTE FUNCTION search_documents_tsvector_trigger();
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS tsvectorupdate ON "search_documents"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS search_documents_tsvector_trigger`);
        await queryRunner.query(`DROP TABLE "search_documents"`);
    }
}
