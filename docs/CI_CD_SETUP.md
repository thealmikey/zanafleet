# CI/CD Pipeline Documentation

This document describes the CI/CD setup for ZanaFleet, including GitHub Actions workflows, pre-commit hooks, and local development practices.

---

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Pre-Commit Hooks](#pre-commit-hooks)
4. [Local Development](#local-development)
5. [Running Tests](#running-tests)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The ZanaFleet CI/CD pipeline ensures code quality and consistency through:

- **Automated Linting & Formatting**: ESLint + Prettier on every push/PR
- **Automated Testing**: Unit and integration tests with coverage reporting
- **Pre-Commit Hooks**: Prevent bad code from being committed
- **Build Verification**: Compile TypeScript to ensure no build errors

### Triggered On

- **Push** to `main`, `develop`, or `feature/**` branches
- **Pull Requests** to `main` or `develop` branches

---

## GitHub Actions Workflow

### Pipeline Structure

The workflow (`.github/workflows/ci.yml`) runs the following jobs in order:

#### 1. **Setup** (Parallel entry point)
   - Verifies Node.js 20+
   - Sets up npm cache
   - Outputs node version for dependent jobs

#### 2. **Lint & Format Check** (Parallel)
   - Runs `npm run format:check` (Prettier)
   - Runs `npm run lint:check` (ESLint)
   - **Fails if**: Formatting issues or linting errors found
   - Generates readable summary in GitHub Actions UI

#### 3. **Unit Tests** (Parallel)
   - Runs Jest unit tests: `npm run test:unit`
   - Generates coverage reports
   - Uploads to Codecov for tracking
   - **Fails if**: Any test fails

#### 4. **Integration Tests** (Parallel)
   - Spins up PostgreSQL and Neo4j services
   - Runs integration tests: `npm run test:integration`
   - Tests event bus + Neo4j projections
   - Generates coverage reports
   - **Fails if**: Any test fails

#### 5. **Build** (Depends on Lint + Unit Tests)
   - Compiles TypeScript: `npm run build`
   - Verifies `dist/` directory exists
   - Uploads build artifacts for download
   - **Fails if**: Build errors occur

#### 6. **CI Summary** (Final status report)
   - Generates final summary of all checks
   - Shows pass/fail status for each job
   - **Fails workflow** if any job failed

### View Workflow Results

1. Go to **GitHub** → **Actions** tab
2. Click on the latest workflow run
3. View detailed logs for each job
4. Download build artifacts (if needed)

### Caching Strategy

- **npm dependencies** are cached using `actions/setup-node`
- Cache is automatically invalidated if `package-lock.json` changes
- This significantly speeds up CI runs (5-15s vs 60s for install)

---

## Pre-Commit Hooks

Pre-commit hooks prevent bad code from being committed to the repository.

### Installation

The hooks are installed automatically when you run:

```bash
npm install
```

This runs `npm run prepare` which installs Husky hooks.

### What Pre-Commit Checks Do

Before each commit, the `.husky/pre-commit` hook:

1. **Runs ESLint** on all staged `.ts` files with auto-fix
2. **Runs Prettier** on all staged `.ts` files with formatting
3. **Prevents commit** if linting/formatting fails
4. **Provides clear guidance** on how to fix issues

### Configuration

- **Hook script**: `.husky/pre-commit`
- **Lint-staged config**: `.lintstagedrc.json`
- **Only checks staged files** (not the entire codebase)

### Example: Committing with Pre-Commit Checks

```bash
# Stage your changes
git add src/modules/organization/organization.module.ts

# Attempt commit
git commit -m "feat: add new organization feature"

# Pre-commit hook runs automatically:
# ✓ ESLint check: PASSED
# ✓ Prettier format: PASSED
# ✓ Commit succeeds
```

### If Pre-Commit Fails

If linting or formatting issues are found:

```bash
❌ Pre-commit checks failed!
   Please fix the errors above and try again.

   💡 Quick fixes:
     - Run: npm run lint      # Auto-fix ESLint issues
     - Run: npm run format    # Auto-format with Prettier
     - Then stage and commit again
```

### Temporarily Bypass Hooks (Not Recommended)

To skip pre-commit hooks in exceptional cases:

```bash
git commit --no-verify -m "message"
```

⚠️ **Note**: This bypasses checks and may cause CI to fail. Only use when necessary.

---

## Local Development

### Setup Environment

```bash
# Install dependencies
npm install

# This runs 'prepare' script which installs Husky hooks
```

### Development Scripts

All linting and testing scripts are in `package.json`:

```bash
# Linting & Formatting
npm run lint              # Run ESLint with auto-fix
npm run lint:check        # Check ESLint (no fix)
npm run format            # Run Prettier formatter
npm run format:check      # Check Prettier (no format)

# Testing
npm run test              # Run all tests (unit + integration)
npm run test:unit         # Run only unit tests
npm run test:watch        # Run tests in watch mode
npm run test:cov          # Run tests with coverage report
npm run test:integration  # Run only integration tests

# Building
npm run build             # Compile TypeScript to JavaScript
npm run start:dev         # Run app in development mode with watch

# CI/CD
npm run ci:lint           # Simulate CI linting checks
npm run ci:test           # Simulate CI testing
npm run ci:all            # Simulate full CI pipeline locally
```

### Before Submitting a Pull Request

Run this locally to verify all CI checks pass:

```bash
npm run ci:all
```

This runs:
1. Prettier format check
2. ESLint linting
3. All unit tests
4. All integration tests

### Running Tests Locally

#### Unit Tests Only

```bash
npm run test:unit

# With coverage
npm run test:unit -- --coverage
```

#### Integration Tests with Services

For integration tests, you need PostgreSQL and Neo4j running:

```bash
# Option 1: Using Docker
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Stop services
docker-compose -f docker-compose.test.yml down
```

#### Watch Mode for Development

```bash
# Re-run tests when files change
npm run test:watch

# Re-run specific file tests
npm run test:watch -- create-organization.handler
```

---

## Running Tests

### Test Structure

Tests are organized by type:

```
src/modules/
  organization/
    tests/
      unit/
        create-organization.command.spec.ts    # Unit test
        create-organization.handler.spec.ts    # Unit test
      integration/
        create-organization.integration.spec.ts # Integration test
```

### Jest Configuration

Jest is configured in `package.json` with:

- **Preset**: `ts-jest` (TypeScript support)
- **Test files**: `**/*.spec.ts`
- **Coverage thresholds**: 70% target
- **Test timeout**: 30 seconds

### Test Coverage

After running tests with coverage:

```bash
npm run test:cov
```

Coverage report is generated in `coverage/` directory. View in browser:

```bash
# Coverage report HTML
open coverage/lcov-report/index.html
```

### Running Specific Tests

```bash
# By file pattern
npm run test -- organization

# By test name
npm run test -- --testNamePattern="CreateOrganization"

# Single file
npm run test -- src/modules/organization/tests/unit/create-organization.handler.spec.ts
```

---

## Configuration Files

### `.eslintrc.json`
- Strict TypeScript linting rules
- Import sorting (ESLint + Prettier compatible)
- Prevents unused variables and `console.log`
- Warnings for `any` types

### `.prettierrc`
- 100-character line width (more readable in terminals)
- Single quotes for strings
- Trailing commas in ES5+ objects/arrays
- 2-space indentation
- LF line endings

### `.lintstagedrc.json`
- Runs ESLint and Prettier only on staged files
- Reduces CI time for commits

### `package.json`
- Node.js version requirement: `>=20.0.0`
- All npm scripts for development
- Husky `prepare` script for hook installation

---

## Best Practices

### For Developers

1. **Install hooks after cloning**:
   ```bash
   npm install
   ```

2. **Run tests before pushing**:
   ```bash
   npm run ci:all
   ```

3. **Keep commits small and focused** on one feature/fix

4. **Write meaningful commit messages**:
   ```
   feat: add organization creation handler
   fix: correct Neo4j projection query
   docs: update API documentation
   ```

5. **Address pre-commit failures immediately** rather than bypassing

### For Code Quality

1. **Run formatting before committing**:
   ```bash
   npm run format
   ```

2. **Check linting before push**:
   ```bash
   npm run lint:check
   ```

3. **Write tests alongside code** (unit + integration)

4. **Aim for >70% coverage** on new modules

5. **Document complex logic** with comments

### For CI/CD

1. **Review workflow logs** in GitHub Actions after each push

2. **Fix failing tests immediately** - don't let them accumulate

3. **Run `npm run ci:all` locally** before pushing to save CI time

4. **Keep dependencies updated** - review Dependabot PRs

5. **Monitor build times** - keep under 10 minutes total

---

## Troubleshooting

### Pre-Commit Hook Issues

#### Hook not running on commit

```bash
# Reinstall Husky
npx husky install

# Make hook executable
chmod +x .husky/pre-commit
```

#### "permission denied" on pre-commit hook

```bash
chmod +x .husky/pre-commit
```

#### Lint-staged not finding files

```bash
# Reinstall dependencies
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Testing Issues

#### Jest timeout errors

```bash
# Increase timeout for integration tests
npm run test:integration -- --testTimeout=60000
```

#### Neo4j connection refused in integration tests

```bash
# Ensure services are running
docker ps

# Restart services
docker-compose down
docker-compose up -d
```

#### PostgreSQL connection errors

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Create test database if needed
createdb zanafleet_test -U postgres
```

### Linting Issues

#### ESLint not auto-fixing

```bash
# Run with verbose output
npx eslint src/ --fix --debug

# Check for syntax errors first
npm run build
```

#### Prettier conflict with ESLint

```bash
# Ensure eslint-config-prettier is installed
npm list eslint-config-prettier

# Run both in sequence
npm run format && npm run lint
```

### Build Issues

#### TypeScript compilation errors

```bash
# Check tsconfig.json
npm run build -- --diagnostics

# Clear dist directory
rm -rf dist
npm run build
```

#### Missing dependencies

```bash
# Verify node_modules
npm install

# Clean install
rm -rf node_modules
npm ci
```

---

## FAQ

**Q: Why does the workflow fail even though tests pass locally?**

A: Environment differences. Run `npm run ci:all` locally which simulates the CI environment.

**Q: Can I skip the pre-commit hook?**

A: Yes, with `git commit --no-verify`, but this may cause CI to fail. Use only for emergencies.

**Q: How do I add a new test?**

A: Create a `.spec.ts` file in the appropriate test folder, import the module, and write test cases.

**Q: How long should CI take?**

A: Typically 3-5 minutes with caching. Without cache, up to 10 minutes.

**Q: Can I run integration tests without Docker?**

A: Not recommended. Services must be running. Use Docker Compose for consistency.

**Q: How do I update ESLint or Prettier rules?**

A: Edit `.eslintrc.json` or `.prettierrc`, then run `npm run format && npm run lint` to apply across codebase.

---

## Support & Feedback

For issues or improvements to the CI/CD pipeline:

1. **Check troubleshooting section** above
2. **Review GitHub Actions logs** for detailed error messages
3. **Run `npm run ci:all`** to reproduce locally
4. **File an issue** with logs and reproduction steps

---

**Last Updated**: January 26, 2025  
**Maintainers**: ZanaFleet Team  
**Node.js Version**: 20+  
**Package Manager**: npm 10+
