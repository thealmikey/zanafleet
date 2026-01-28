# Contributing to ZanaFleet

Thank you for contributing to ZanaFleet! This document provides guidelines for developing code, running tests, and submitting pull requests.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Standards](#code-standards)
4. [Testing Requirements](#testing-requirements)
5. [Submitting Changes](#submitting-changes)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js**: 20.0.0 or higher
- **npm**: 10.0.0 or higher
- **Docker**: For running integration tests with PostgreSQL and Neo4j

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/zanafleet/zanafleet.git
cd zanafleet

# Install dependencies (this installs Husky pre-commit hooks)
npm install

# Verify setup
npm run ci:all
```

### Tokens and Secrets (Optional)

**Good news!** No tokens or secrets are required for local development. You can run the full development workflow immediately after cloning:

```bash
# All of these work out of the box:
npm install          # Uses public npm registry
npm run build        # Compiles TypeScript
npm run test         # Runs unit tests
npm run test:integration  # Requires Docker services only
docker-compose -f docker-compose.test.yml up -d  # No auth needed
```

#### Optional Tokens for Advanced Workflows

The following tokens are **only needed for specific CI/CD or publishing workflows**:

| Token | Purpose | When Needed |
|-------|---------|-------------|
| `CODECOV_TOKEN` | Upload coverage reports | CI pipeline for private repos |
| `NPM_TOKEN` | Publish to npm registry | Publishing packages (not configured) |
| `GHCR_TOKEN` | Push Docker images | Container registry publishing |

**Note:** The CI pipeline is configured to continue even when these tokens are missing (`fail_ci_if_error: false`), so PRs will still pass all required checks.

#### If You Need Private Registry Access

If your organization uses a private npm registry, configure `.npmrc` locally:

```bash
# Uncomment and modify in .npmrc:
# registry=https://your-registry.example.com/
# //your-registry.example.com/:_authToken=${NPM_TOKEN}
```

This is **not required** for the open-source ZanaFleet project.

#### npm Configuration Notes

The `.npmrc` file is configured for developer-friendly local development:

| Setting | Local Dev | CI Pipeline |
|---------|-----------|-------------|
| Lock file validation | Flexible (`npm install`) | Strict (`npm ci`) |
| Security audits | Optional | Enforced separately |
| Package lock | Enabled | Enabled |

If you encounter audit-related installation failures due to transitive dependency vulnerabilities:

```bash
# Bypass audit temporarily (review vulnerabilities manually)
npm install --no-audit
```

**Note:** Always address security vulnerabilities before merging to main.

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
# or for bug fixes:
git checkout -b fix/my-bugfix
```

### 2. Make Your Changes

Follow the [code standards](#code-standards) below.

```bash
# Make your changes to src/modules/...

# Check formatting before committing
npm run format
npm run lint
```

### 3. Verify External Dependencies (MCP)

Before writing code that uses external libraries, verify API compatibility:

```bash
# Using Context7 MCP tool (in AI-assisted environments)
# 1. Resolve the library ID
resolve-library-id: "nestjs"

# 2. Query current documentation
query-docs: { libraryId: "/nestjs/nest", topic: "your-feature" }
```

**Required for**: NestJS decorators, TypeORM entities, Neo4j queries, Zod schemas.

See [AGENTS.md Section 6](./AGENTS.md#6-mcp-verification-workflows) for detailed verification protocols.

### 4. Write Tests

Add unit and integration tests for your changes.

```bash
# Run tests locally
npm run test:unit
npm run test:integration

# View coverage
npm run test:cov
```

### 5. Commit Your Changes

Pre-commit hooks will automatically run linting and formatting checks:

```bash
git add .
git commit -m "feat: add new feature"

# Pre-commit hook runs automatically and:
# ✓ Auto-fixes any ESLint issues
# ✓ Auto-formats with Prettier
# ✓ Prevents commit if checks fail
```

If pre-commit checks fail, fix the issues and retry:

```bash
npm run format
npm run lint
git add .
git commit -m "feat: add new feature"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub.

---

## Code Standards

### File Organization

Follow the module structure for new features:

```
src/modules/my-module/
  ├── index.ts                       # Public exports
  ├── my-module.module.ts            # NestJS module
  ├── commands/
  │   ├── my-command.command.ts      # Command definition
  │   └── my-command.handler.ts      # Command handler
  ├── dto/
  │   ├── my-request.dto.ts
  │   └── my.enums.ts
  ├── entities/
  │   └── my-entity.entity.ts        # TypeORM entity
  ├── events/
  │   └── my-created.event.ts        # Event definition
  ├── projections/
  │   └── my-neo4j.projection.ts     # Neo4j projection
  └── tests/
      ├── unit/
      │   └── my.spec.ts
      └── integration/
          └── my.integration.spec.ts
```

### Naming Conventions

- **Commands**: `CreateOrganization`, `UpdateOrganization`
- **Events**: `OrganizationCreatedEvent`, `OrganizationUpdatedEvent`
- **Handlers**: `CreateOrganizationHandler`, `OrganizationCreatedEventHandler`
- **Files**: Use kebab-case: `create-organization.command.ts`
- **Classes**: Use PascalCase: `CreateOrganizationCommand`

### Code Style

#### TypeScript

- Use strict TypeScript (`strict: true`)
- Add explicit return types to functions
- Use interfaces for contracts

```typescript
// ✓ Good
async createOrganization(command: CreateOrganizationCommand): Promise<void> {
  // implementation
}

// ✗ Bad
async createOrganization(command: any) {
  // implementation
}
```

#### Imports

Imports are automatically organized by the pre-commit hook. Manual order:

```typescript
// 1. Built-in Node.js modules
import { v4 as uuid } from 'uuid';

// 2. External packages
import { Injectable } from '@nestjs/common';

// 3. Internal modules
import { Organization } from '../entities/organization.entity';
```

#### Comments

Write comments for complex logic, not obvious code:

```typescript
// ✓ Good - Explains WHY
// Neo4j requires explicit relationship creation to maintain projections
const result = await this.neo4jService.createProjection(org);

// ✗ Bad - Obvious from code
// Set the organization id
org.id = uuid();
```

### Error Handling

Always handle errors explicitly:

```typescript
try {
  await this.organizationRepository.save(organization);
} catch (error) {
  this.logger.error('Failed to create organization', error);
  throw new BadRequestException('Organization creation failed');
}
```

---

## Testing Requirements

### Coverage Thresholds

- **Minimum**: 60% coverage on new code
- **Target**: 80% coverage for core modules
- **Critical paths**: 90% coverage (auth, payments, etc.)

### Unit Tests

Test business logic in isolation:

```typescript
describe('CreateOrganizationHandler', () => {
  let handler: CreateOrganizationHandler;

  beforeEach(async () => {
    handler = new CreateOrganizationHandler(mockRepository);
  });

  it('should create organization with valid data', async () => {
    const command = new CreateOrganizationCommand({
      name: 'Test Org',
    });
    
    const result = await handler.execute(command);
    
    expect(result).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should throw error for duplicate organization', async () => {
    mockRepository.findOne.mockResolvedValue({ id: '123' });
    
    const command = new CreateOrganizationCommand({
      name: 'Existing Org',
    });
    
    await expect(handler.execute(command)).rejects.toThrow();
  });
});
```

### Integration Tests

Test end-to-end flows with real services:

```typescript
describe('CreateOrganization Integration', () => {
  it('should create organization and project in Neo4j', async () => {
    // Uses real PostgreSQL and Neo4j
    const command = new CreateOrganizationCommand({
      name: 'Integration Test Org',
    });

    await handler.execute(command);

    // Verify PostgreSQL
    const org = await organizationRepository.findOne({ name: 'Integration Test Org' });
    expect(org).toBeDefined();

    // Verify Neo4j projection
    const neo4jOrg = await neo4jService.getOrganization(org.id);
    expect(neo4jOrg).toBeDefined();
  });
});
```

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests only (requires Docker services)
npm run test:integration

# Watch mode for development
npm run test:watch

# With coverage
npm run test:cov

# Specific file
npm run test -- create-organization.handler
```

### Coverage Report

View the HTML coverage report:

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

---

## Submitting Changes

### Pull Request Checklist

Before submitting a PR, verify:

- [ ] Code follows style guides
- [ ] Tests added/updated for all changes
- [ ] Coverage maintained (70%+)
- [ ] `npm run ci:all` passes locally
- [ ] Commit messages are clear and descriptive
- [ ] Documentation updated if needed
- [ ] No console.log statements left (use logger)
- [ ] No hardcoded values (use environment variables)
- [ ] MCP verification performed for new external API usage

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] All tests passing

## Related Issues
Closes #(issue number)
```

### Commit Message Format

Use conventional commits:

```
<type>: <subject>

<body>

<footer>
```

Types:

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style (no logic change)
- **refactor**: Code refactoring
- **test**: Adding/updating tests
- **chore**: Dependency updates, tooling

Examples:

```
feat: add organization creation handler

- Implements CQRS pattern
- Includes Neo4j projection
- Adds comprehensive tests

Closes #123
```

---

## CI/CD Integration

### GitHub Actions

Every push and PR triggers automated checks:

1. **Linting**: ESLint + Prettier
2. **Unit Tests**: Jest with coverage
3. **Integration Tests**: With PostgreSQL + Neo4j
4. **Build**: TypeScript compilation

All checks must pass before merging.

### Local CI Simulation

Before pushing, run the full CI locally:

```bash
npm run ci:all
```

Or use Make:

```bash
make ci
```

### View CI Results

1. Push your changes
2. Go to GitHub → **Actions** tab
3. Click the latest workflow run
4. Review logs for any failures

---

## Troubleshooting

### Pre-Commit Hook Issues

**Hook not running:**

```bash
npx husky install
chmod +x .husky/pre-commit
```

**"Permission denied" on commit:**

```bash
chmod +x .husky/pre-commit
chmod +x .husky/_/husky.sh
```

### Test Failures

**Integration tests timeout:**

```bash
# Ensure services are running
docker-compose -f docker-compose.test.yml up -d

# Or increase timeout
npm run test:integration -- --testTimeout=60000
```

**Database connection errors:**

```bash
# Check PostgreSQL
psql -U postgres -c "SELECT version();"

# Check Neo4j
curl http://localhost:7474

# Recreate test database
createdb zanafleet_test -U postgres
```

### Build Errors

**TypeScript compilation errors:**

```bash
npm run build -- --diagnostics
```

**Missing dependencies:**

```bash
npm ci
rm -rf node_modules
npm install
```

### Linting Issues

**ESLint conflicts:**

```bash
npm run format && npm run lint
```

**Prettier not formatting:**

```bash
npx prettier --write src/
```

---

## Best Practices

1. **Small, focused commits** - One feature per commit
2. **Meaningful commit messages** - Others should understand your changes
3. **Test-driven development** - Write tests before code
4. **Code review mindset** - Write code for humans first
5. **Documentation** - Update docs with new features
6. **Performance** - Consider database query performance
7. **Security** - Never commit secrets, use .env files
8. **Backwards compatibility** - Don't break existing APIs

---

## Resources

- [ZanaFleet Architecture](./docs/ARCHITECTURE.md)
- [Event-Driven Design](./docs/EVENT_DRIVEN.md)
- [CI/CD Setup](./docs/CI_CD_SETUP.md)
- [NestJS Documentation](https://docs.nestjs.com)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)

---

## Questions?

- Check existing issues on GitHub
- Review code in related modules
- Ask in team discussions

Thank you for contributing to ZanaFleet! 🚀
