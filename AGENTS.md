# ZanaFleet Coding Style Guide

This guide outlines the specific architectural patterns and development conventions of the ZanaFleet codebase. It focuses on the project's event-driven nature and multi-agent development workflow.

## 1. Architectural Patterns

### Event-Driven Flow
All logic must follow the **Command → Event → Handler → Projection** flow.
- **Commands:** Intent to change state.
- **Events:** Immutable facts of what happened.
- **Handlers:** Logic that processes commands and emits events.
- **Projections:** Read-models (specifically Neo4j graph updates) that represent the current state.

### Strict Module Isolation
- **No Direct DB Access:** Modules must never read from or write to another module’s database.
- **Event-Based Integration:** Communication between modules occurs exclusively via the Event Bus (NATS/Redis).
- **Folder Ownership:** Developers and AI agents work within assigned module directories to prevent conflicts.

## 2. Naming Conventions

### Event & Command Contracts
Use a strict three-part dot notation with versioning:
- **Format:** `<Module>.<Entity>.<Action>V<Number>`
- **Example:** `Organization.Rider.VerifiedV1`, `Wallet.Transaction.StartedV2`

### Code Organization
- Use the **Primitives First** approach. Core logic belongs in `src/core/`, while domain-specific extensions reside in `src/modules/`.
- **Tests:** Place tests within the module folder:
  - Unit: `modules/<name>/tests/unit/*.spec.ts`
  - Integration: `modules/<name>/tests/integration/*.integration.spec.ts`

## 3. TypeScript & Linting Standards

### Type Safety
- **Strict Mode:** TypeScript must remain in strict mode.
- **Explicit Returns:** Always define function return types (`@typescript-eslint/explicit-function-return-type` is set to `warn` but encouraged).
- **Floating Promises:** Must be handled or explicitly marked. Use `await` or `.catch()`.

### Variable & Import Naming
- **Unused Variables:** Prefix unused variables with an underscore (e.g., `_request`).
- **Import Ordering:**
  1. Built-in (e.g., `fs`)
  2. External (e.g., `@nestjs/**`)
  3. Internal (e.g., `src/core/**`)
  4. Relative (parent, sibling, index)

## 4. Development Workflow

### AI-Assisted Development
- **Prompt Library:** Use templates in `docs/prompts/` to scaffold commands, events, and handlers. 
- Always update the prompt library when introducing new patterns to ensure deterministic AI code generation.

### Local Quality Assurance
- **CI Simulation:** Run `npm run ci:all` or `make ci` before pushing. This executes linting, unit tests, and integration tests in a single pipeline.
- **Integration Tests:** Require Docker services (Postgres, Neo4j). Use `docker-compose -f docker-compose.test.yml up -d` before running `npm run test:integration`.

### Automated Enforcement
- **Pre-commit Hooks:** Husky and `lint-staged` automatically run ESLint and Prettier on staged files. Do not use `--no-verify` unless absolutely necessary.
- **Coverage:** Maintain a minimum of **70% test coverage** for all new modules.

## 5. Persistence & Observability
- **Dual Persistence:** 
  - **Postgres:** Primary store for primitives and event logs (atomicity).
  - **Neo4j:** Graph projections for real-time visibility and relationship mapping.
- **Observability:** Every state change event must have a corresponding Neo4j projection update to maintain the system's "real-time visibility" principle.