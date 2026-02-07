#!/bin/bash

# ============================================================================
# ZanaFleet CI Helper Script
# ============================================================================
# This script automates common CI/CD tasks for development and CI environments.
#
# Usage:
#   ./scripts/ci.sh lint              # Run linting checks
#   ./scripts/ci.sh format            # Format code
#   ./scripts/ci.sh test              # Run all tests
#   ./scripts/ci.sh test:unit         # Run unit tests only
#   ./scripts/ci.sh test:integration  # Run integration tests
#   ./scripts/ci.sh build             # Build application
#   ./scripts/ci.sh all               # Full CI pipeline
#   ./scripts/ci.sh help              # Show help
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}===============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}===============================================${NC}"
  echo ""
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Functions for Each Command
# ============================================================================

run_lint() {
  print_header "Running ESLint"
  npm run lint:check
  print_success "Linting passed!"
}

run_format() {
  print_header "Running Prettier"
  npm run format:check
  print_success "Format check passed!"
}

run_format_fix() {
  print_header "Formatting code with Prettier"
  npm run format
  print_success "Formatting complete!"
}

run_test_unit() {
  print_header "Running Unit Tests"
  npm run test:unit -- --coverage --ci
  print_success "Unit tests passed!"
}

run_test_integration() {
  print_header "Running Integration Tests"
  
  # Check if services are running
  if ! check_services; then
    print_error "Required services not running!"
    echo ""
    echo "To run integration tests, start services:"
    echo "  docker-compose -f docker-compose.test.yml up -d"
    exit 1
  fi
  
  npm run test:integration -- --coverage --ci
  print_success "Integration tests passed!"
}

run_test_all() {
  print_header "Running All Tests"
  npm run test:all
  print_success "All tests passed!"
}

run_build() {
  print_header "Building Application"
  npm run build
  
  if [ -d "dist" ]; then
    print_success "Build successful!"
    echo ""
    echo "Build artifacts:"
    ls -lah dist | head -10
  else
    print_error "Build failed - dist directory not found"
    exit 1
  fi
}

run_verify_contracts() {
  print_header "Verifying @zanafleet/contracts"
  npm run verify:contracts
  print_success "Contracts verification passed!"
}

run_build_web() {
  print_header "Building Web Application"
  
  # Build web app to verify TypeScript/webpack resolution of @zanafleet/contracts
  cd apps/web
  npm run build
  cd ../..
  
  print_success "Web build successful!"
}

run_ci_all() {
  print_header "Running Full CI Pipeline"
  
  # Step 1: Format check
  print_info "Step 1/5: Code Quality - Prettier Check"
  npm run format:check || exit 1
  print_success "Prettier check passed"
  echo ""
  
  # Step 2: Lint check
  print_info "Step 2/5: Code Quality - ESLint Check"
  npm run lint:check || exit 1
  print_success "ESLint check passed"
  echo ""
  
  # Step 3: Verify contracts resolution
  print_info "Step 3/5: Contracts Verification"
  npm run verify:contracts || exit 1
  print_success "Contracts verification passed"
  echo ""
  
  # Step 4: Unit tests
  print_info "Step 4/5: Unit Tests"
  npm run test:unit -- --coverage || exit 1
  print_success "Unit tests passed"
  echo ""
  
  # Step 5: Build
  print_info "Step 5/5: Build"
  npm run build || exit 1
  print_success "Build successful"
  echo ""
  
  print_success "All CI checks passed!"
}

check_services() {
  # Check if PostgreSQL is accessible
  if ! nc -z localhost 5432 2>/dev/null; then
    return 1
  fi
  
  # Check if Neo4j is accessible
  if ! nc -z localhost 7687 2>/dev/null; then
    return 1
  fi
  
  return 0
}

print_help() {
  cat << EOF
${BLUE}ZanaFleet CI Helper Script${NC}

${BLUE}Usage:${NC}
  ./scripts/ci.sh <command>

${BLUE}Commands:${NC}
  lint              Run ESLint linting checks
  format            Check Prettier formatting
  format:fix        Run Prettier formatter
  test              Run all tests (unit + integration)
  test:unit         Run unit tests only
  test:integration  Run integration tests only
  build             Build TypeScript application
  build:web         Build web application (verifies contracts resolution)
  verify:contracts  Verify @zanafleet/contracts can be imported
  all               Run full CI pipeline (no integration tests)
  help              Show this help message

${BLUE}Examples:${NC}
  ./scripts/ci.sh lint
  ./scripts/ci.sh test:unit
  ./scripts/ci.sh all

${BLUE}Environment Variables:${NC}
  CI=true           Set to run in CI mode (default behavior)
  DEBUG=1           Enable debug output

${BLUE}For more information, see:${NC}
  docs/CI_CD_SETUP.md

EOF
}

# ============================================================================
# Main Script
# ============================================================================

main() {
  local command="${1:-help}"
  
  # Verify npm is available
  if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js and npm."
    exit 1
  fi
  
  # Run the requested command
  case "$command" in
    lint)
      run_lint
      ;;
    format)
      run_format
      ;;
    format:fix)
      run_format_fix
      ;;
    test)
      run_test_all
      ;;
    test:unit)
      run_test_unit
      ;;
    test:integration)
      run_test_integration
      ;;
    build)
      run_build
      ;;
    build:web)
      run_build_web
      ;;
    verify:contracts)
      run_verify_contracts
      ;;
    all)
      run_ci_all
      ;;
    help)
      print_help
      ;;
    *)
      print_error "Unknown command: $command"
      echo ""
      print_help
      exit 1
      ;;
  esac
}

# Run main function
main "$@"
