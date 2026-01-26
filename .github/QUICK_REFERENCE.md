# 🔥 ZanaFleet CI/CD Quick Reference

**TL;DR** - Essential commands for daily development.

---

## Setup (First Time)

```bash
npm install           # Install deps + Husky hooks
npm run ci:all        # Verify everything works
```

---

## Development Workflow

```bash
# Start coding
npm run start:dev     # Dev server (port 3000)
npm run test:watch    # Tests auto-run on changes

# Before committing
npm run format        # Auto-format code
npm run lint          # Auto-fix lint issues

# Commit (hooks run automatically)
git add .
git commit -m "feat: description"

# Push to GitHub
git push origin branch-name
```

---

## Common Commands

### Formatting & Linting
```bash
npm run format         # Fix formatting
npm run lint           # Fix linting issues
npm run format:check   # Check (no fix)
npm run lint:check     # Check (no fix)
```

### Testing
```bash
npm run test           # All tests
npm run test:unit      # Unit tests only
npm run test:watch     # Watch mode
npm run test:cov       # Coverage report
npm run test:integration  # Integration (needs Docker)
```

### Building
```bash
npm run build          # Compile TypeScript
npm run start:prod     # Run production build
```

### CI Simulation
```bash
npm run ci:all         # Full CI pipeline locally
npm run ci:lint        # Just linting checks
npm run ci:test        # Just tests
```

---

## Using Makefile (Alternative)

```bash
make help              # Show all commands
make setup             # Install + setup hooks
make lint              # Run ESLint
make test              # Run all tests
make ci                # Full CI pipeline
make build             # Build app
make clean             # Remove dist, coverage
```

---

## Using Shell Script (Alternative)

```bash
./scripts/ci.sh lint               # ESLint check
./scripts/ci.sh format             # Format check
./scripts/ci.sh test:unit          # Unit tests
./scripts/ci.sh test:integration   # Integration tests
./scripts/ci.sh all                # Full pipeline
./scripts/ci.sh help               # Show help
```

---

## Docker (for Integration Tests)

```bash
# Start services
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Stop services
docker-compose -f docker-compose.test.yml down
```

---

## Pre-Commit Hooks

**Auto-runs before every commit:**
- ✅ ESLint (auto-fixes)
- ✅ Prettier (auto-formats)

**If hook fails:**
```bash
npm run format && npm run lint
git add .
git commit -m "message"
```

**Skip hook (not recommended):**
```bash
git commit --no-verify
```

---

## GitHub Actions

**Triggers on:**
- Push to `main`, `develop`, `feature/**`
- Pull requests to `main` or `develop`

**View results:**
1. GitHub → Actions tab
2. Click latest workflow
3. Check logs for details

**Required to pass before merge:**
- ✅ Linting (ESLint)
- ✅ Formatting (Prettier)
- ✅ Unit tests
- ✅ Integration tests
- ✅ Build

---

## Before Pushing Code

```bash
npm run ci:all
```

This runs same checks as GitHub Actions.  
Takes ~45s first time, ~30s with cache.

---

## If Tests Fail Locally

```bash
# Unit tests fail
npm run test:unit -- --detectOpenHandles

# Integration tests fail
docker-compose -f docker-compose.test.yml up -d
npm run test:integration -- --testTimeout=60000

# Linting fails
npm run format && npm run lint
```

---

## Documentation

| What? | Where? |
|-------|--------|
| Detailed setup | `docs/CI_CD_SETUP.md` |
| Contribution workflow | `CONTRIBUTING.md` |
| Setup summary | `CICD_SETUP_SUMMARY.md` |
| Quick ref (this file) | `.github/QUICK_REFERENCE.md` |

---

## Typical Day (Example)

```bash
# Morning: Setup
npm install
npm run ci:all

# During day: Coding
npm run start:dev      # Dev server
npm run test:watch    # Tests auto-run

# Before commit: Check code
npm run format        # Format if needed
npm run lint          # Lint if needed

# Commit
git add .
git commit -m "feat: add awesome feature"
# Hooks run automatically ✓

# Push
git push origin feature/awesome-feature

# CI runs automatically on GitHub
# (Check Actions tab for results)
```

---

## Status Badges (For README)

```markdown
[![CI/CD Pipeline](https://github.com/zanafleet/zanafleet/actions/workflows/ci.yml/badge.svg)](https://github.com/zanafleet/zanafleet/actions/workflows/ci.yml)
```

---

## Troubleshooting (Quick)

| Problem | Solution |
|---------|----------|
| Hook not running | `npx husky install` |
| Permission denied | `chmod +x .husky/pre-commit` |
| ESLint conflicts | `npm run format && npm run lint` |
| Tests timeout | Increase timeout or check Docker |
| Build fails | `npm run build -- --diagnostics` |

See `docs/CI_CD_SETUP.md` for detailed troubleshooting.

---

## Help Commands

```bash
npm run           # List all scripts
make help         # List Makefile commands
./scripts/ci.sh help  # List script commands
```

---

**Key Point**: Run `npm run ci:all` before pushing to save CI time! 🚀
