.PHONY: help install setup lint format test test-unit test-integration build ci-all clean

# ============================================================================
# ZanaFleet Makefile
# ============================================================================
# Convenient commands for common development tasks.
# Run 'make help' to see all available commands.
# ============================================================================

help:
	@echo "ZanaFleet Development Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Install dependencies and setup Husky hooks"
	@echo "  make install        - Install npm dependencies"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           - Run ESLint with auto-fix"
	@echo "  make lint-check     - Check ESLint (no auto-fix)"
	@echo "  make format         - Run Prettier formatter"
	@echo "  make format-check   - Check Prettier (no formatting)"
	@echo "  make qa             - Run lint + format checks"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests (unit + integration)"
	@echo "  make test-unit      - Run unit tests only"
	@echo "  make test-watch     - Run tests in watch mode"
	@echo "  make test-cov       - Run tests with coverage report"
	@echo "  make test-int       - Run integration tests only"
	@echo ""
	@echo "Building:"
	@echo "  make build          - Compile TypeScript to JavaScript"
	@echo "  make dev            - Start app in development mode (watch)"
	@echo ""
	@echo "CI/CD:"
	@echo "  make ci             - Simulate full CI pipeline locally"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Remove dist, coverage, and node_modules"
	@echo "  make clean-dist     - Remove compiled output"
	@echo "  make clean-cache    - Clear npm cache"
	@echo ""

# ============================================================================
# Setup & Installation
# ============================================================================

setup: install
	@echo "✓ Setup complete! Husky hooks installed."

install:
	@echo "📦 Installing dependencies..."
	npm ci --prefer-offline --no-audit

# ============================================================================
# Code Quality
# ============================================================================

lint:
	@echo "🔍 Running ESLint with auto-fix..."
	npm run lint

lint-check:
	@echo "🔍 Checking ESLint (no auto-fix)..."
	npm run lint:check

format:
	@echo "✨ Formatting code with Prettier..."
	npm run format

format-check:
	@echo "✨ Checking Prettier formatting..."
	npm run format:check

qa: format-check lint-check
	@echo "✅ All code quality checks passed!"

# ============================================================================
# Testing
# ============================================================================

test:
	@echo "🧪 Running all tests..."
	npm run test

test-unit:
	@echo "🧪 Running unit tests..."
	npm run test:unit

test-watch:
	@echo "🔄 Running tests in watch mode..."
	npm run test:watch

test-cov:
	@echo "📊 Running tests with coverage..."
	npm run test:cov
	@echo ""
	@echo "Coverage report: open coverage/lcov-report/index.html"

test-int:
	@echo "🧪 Running integration tests..."
	npm run test:integration

# ============================================================================
# Building
# ============================================================================

build:
	@echo "🏗️ Building application..."
	npm run build
	@echo "✓ Build complete! Output: dist/"

dev:
	@echo "🚀 Starting development server..."
	npm run start:dev

# ============================================================================
# CI/CD
# ============================================================================

ci: clean-dist
	@echo "🔄 Simulating CI pipeline locally..."
	@echo ""
	@echo "Step 1: Code Quality"
	npm run format:check
	npm run lint:check
	@echo ""
	@echo "Step 2: Unit Tests"
	npm run test:unit
	@echo ""
	@echo "Step 3: Integration Tests"
	npm run test:integration
	@echo ""
	@echo "Step 4: Build"
	npm run build
	@echo ""
	@echo "✅ All CI checks passed!"

# ============================================================================
# Cleanup
# ============================================================================

clean: clean-dist clean-deps
	@echo "🧹 Full cleanup complete!"

clean-dist:
	@echo "Removing dist/ and coverage/..."
	rm -rf dist coverage .jest

clean-deps:
	@echo "Removing node_modules/..."
	rm -rf node_modules package-lock.json

clean-cache:
	@echo "Clearing npm cache..."
	npm cache clean --force

# ============================================================================
# Utility
# ============================================================================

logs:
	@echo "GitHub Actions workflow logs:"
	@echo "  https://github.com/<org>/zanafleet/actions"

docs:
	@echo "📚 CI/CD Documentation: docs/CI_CD_SETUP.md"
	@echo "Use 'make help' for available commands"
