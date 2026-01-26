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

## 6. MCP Verification Workflows

### Purpose
Before generating code or modifying configurations, AI agents and developers **must** verify third-party library compatibility using MCP (Model Context Protocol) servers. This ensures all code aligns with current API specifications and avoids deprecated patterns.

### Available MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `context7` | Query up-to-date library documentation | Before using any external library API |
| `deepwiki` | Access internal knowledge base and GitHub repository docs | For project-specific patterns and conventions |

### Mandatory Verification Steps

1. **Library Resolution**: Use `resolve-library-id` to obtain the Context7-compatible library ID
2. **Documentation Query**: Use `query-docs` to retrieve current API specifications
3. **Cross-Reference**: Compare retrieved docs against versions in `DEPENDENCIES.md`

### Core Technology Verification

The following technologies **require** MCP verification before code generation:

| Technology | Context7 ID Pattern | Verification Focus |
|------------|---------------------|-------------------|
| NestJS | `/nestjs/nest` | Decorators, module patterns, CQRS |
| TypeORM | `/typeorm/typeorm` | Entity definitions, migrations, query builder |
| Neo4j | `/neo4j/neo4j-javascript-driver` | Driver API, Cypher patterns |
| Zod | `/colinhacks/zod` | Schema definitions, validation methods |

### Verification Workflow Example

```
# Step 1: Resolve library ID
callMcpTool("resolve-library-id", { libraryName: "nestjs" })

# Step 2: Query specific documentation
callMcpTool("query-docs", { 
  libraryId: "/nestjs/nest",
  topic: "CQRS command handlers"
})

# Step 3: For project-specific context, use deepwiki
callMcpTool("read_wiki_contents", {
  repository: "zanafleet/zanafleet",
  path: "architecture/event-driven"
})
```

### Version Reconciliation

When generating code that depends on external libraries:
1. **Check `DEPENDENCIES.md`** for pinned versions
2. **Query Context7** for the latest stable API for that version
3. **Flag discrepancies** if local versions are outdated
4. **Document breaking changes** in commit messages when upgrading

### DeepWiki Integration

Use `deepwiki` MCP tools for:
- **`read_wiki_structure`**: Discover available documentation topics
- **`read_wiki_contents`**: Retrieve specific documentation pages
- **`ask_question`**: Query the repository's knowledge base directly

### Enforcement

- **Pre-Generation**: All AI-generated code must be preceded by MCP verification
- **Code Review**: Reviewers may request MCP verification evidence for unfamiliar APIs
- **CI Integration**: Consider adding version-check scripts that validate against Context7

## 7. Human-in-the-Loop CI Verification

### Purpose
When AI agents or developers modify CI/CD configuration files, a manual verification step is **required** to confirm the pipeline executes successfully on the hosting platform.

### Trigger Conditions
This verification is mandatory when changes are made to:
- `.github/workflows/*.yml` (GitHub Actions workflows)
- `docker-compose*.yml` (Docker service configurations)
- `package.json` scripts related to CI (`test:*`, `lint:*`, `build`)
- Jest or ESLint configuration files

### Verification Workflow

1. **Push Changes**: Commit and push CI-related changes to a feature branch
2. **Monitor Pipeline**: Navigate to the GitHub Actions tab and observe the workflow run
3. **Confirm Success**: Verify all jobs complete with ✓ status:
   - Setup
   - Lint & Format Check
   - Unit Tests
   - Integration Tests
   - Build & Compile
4. **Document Failures**: If any job fails, capture the error log and address before merging

### Agent Prompt Template

When an AI agent completes CI-related changes, it must output this reminder:

```
⚠️ CI VERIFICATION REQUIRED

You have modified CI/CD configuration. Before proceeding:
1. Push this branch to GitHub
2. Navigate to: https://github.com/<org>/<repo>/actions
3. Verify the workflow completes successfully
4. Confirm all jobs show ✓ status

Do not proceed until CI verification is complete.
```

### Tokens and Secrets

The following secrets may need configuration in GitHub repository settings:
| Secret | Purpose | Required For |
|--------|---------|--------------|
| `CODECOV_TOKEN` | Coverage upload | Private repository coverage reports |
| `NPM_TOKEN` | Package registry | Publishing to npm (when needed) |
| `GHCR_TOKEN` | Container registry | Docker image publishing (when needed) |

**Note**: Until these tokens are configured, related CI steps should use `fail_ci_if_error: false` or `continue-on-error: true` to prevent blocking the pipeline.