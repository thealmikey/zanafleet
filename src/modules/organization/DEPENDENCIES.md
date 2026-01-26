# Organization Module - Dependencies & Configuration

This file documents the required dependencies and their versions for the Organization module.

## Required Dependencies

### Core NestJS
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0",
  "@nestjs/cqrs": "^10.0.0"
}
```

### Database
```json
{
  "@nestjs/typeorm": "^10.0.0",
  "typeorm": "^0.3.16",
  "pg": "^8.10.0"
}
```

### Graph Database
```json
{
  "@nestjs-modules/neo4j": "^3.0.0",
  "neo4j-driver": "^5.0.0"
}
```

### Validation & Utilities
```json
{
  "zod": "^3.22.0",
  "uuid": "^9.0.0"
}
```

### Testing
```json
{
  "@nestjs/testing": "^10.0.0",
  "jest": "^29.0.0",
  "@types/jest": "^29.5.0",
  "ts-jest": "^29.1.0"
}
```

## Full Package.json Example

```json
{
  "name": "zanafleet",
  "version": "1.0.0",
  "description": "AI-accelerated, event-driven last-mile logistics platform",
  "author": "ZanaFleet Team",
  "private": true,
  "license": "MIT",
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/cqrs": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs-modules/neo4j": "^3.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "neo4j-driver": "^5.0.0",
    "pg": "^8.10.0",
    "reflect-metadata": "^0.1.13",
    "rimraf": "^5.0.0",
    "rxjs": "^7.8.0",
    "typeorm": "^0.3.16",
    "uuid": "^9.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/supertest": "^2.0.12",
    "@typescript-eslint/eslint-plugin": "^5.59.11",
    "@typescript-eslint/parser": "^5.59.11",
    "eslint": "^8.42.0",
    "jest": "^29.5.0",
    "prettier": "^2.8.8",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}
```

## TypeORM Configuration (ormconfig.json or env-based)

```json
{
  "type": "postgres",
  "host": "${DB_HOST:localhost}",
  "port": "${DB_PORT:5432}",
  "username": "${DB_USER:postgres}",
  "password": "${DB_PASSWORD:password}",
  "database": "${DB_NAME:zanafleet}",
  "entities": [
    "dist/modules/**/entities/*.entity.js"
  ],
  "migrations": [
    "dist/migrations/*.js"
  ],
  "subscribers": [
    "dist/subscribers/*.js"
  ],
  "synchronize": false,
  "logging": true,
  "ssl": false
}
```

## NestJS Configuration (nest-cli.json)

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  },
  "monorepo": false,
  "root": "."
}
```

## Jest Configuration (jest.config.js)

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.interface.ts',
    '!**/index.ts',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
};
```

## Environment Variables (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=zanafleet

# Neo4j
NEO4J_URL=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# NATS (Event Bus)
NATS_URL=nats://localhost:4222

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

## TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "src/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

## Installation

```bash
# Install all dependencies
npm install

# Or with yarn
yarn install

# Or with pnpm
pnpm install
```

## Migration Example

Create `src/migrations/1234567890000-CreateOrganizations.ts`:

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOrganizations1234567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['SACCO', 'Business', 'Platform', 'Internal'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'suspended', 'pilot', 'legacy'],
            isNullable: false,
          },
          {
            name: 'linkedWallets',
            type: 'uuid',
            isArray: true,
            default: "ARRAY[]::uuid[]",
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        name: 'idx_organizations_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('organizations');
  }
}
```

## Running Migrations

```bash
# Create migration
npm run typeorm migration:create -- src/migrations/CreateOrganizations

# Run migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

## Notes

- All versions are pinned to stable releases
- Consider using npm shrinkwrap or package-lock.json for reproducibility
- Update dependencies regularly for security patches
- Test after updating dependencies
- Use `npm audit` to check for vulnerabilities

## MCP Verification

When updating dependencies or using new APIs from these packages, verify compatibility using MCP tools:

```bash
# Verify NestJS CQRS patterns
resolve-library-id: "@nestjs/cqrs"
query-docs: { libraryId: "/nestjs/cqrs", topic: "command handlers" }

# Verify TypeORM entity patterns  
resolve-library-id: "typeorm"
query-docs: { libraryId: "/typeorm/typeorm", topic: "entity decorators" }

# Verify Neo4j driver usage
resolve-library-id: "neo4j-driver"
query-docs: { libraryId: "/neo4j/neo4j-javascript-driver", topic: "session management" }
```

See [AGENTS.md](../../AGENTS.md) for the complete MCP verification workflow.
