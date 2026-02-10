
# ZanaFleet

**ZanaFleet** is an AI-accelerated, event-driven, extensible last-mile logistics and delivery platform designed for Africa. Its goal is to provide **trusted, verified rider services** for businesses while enabling rapid iteration, multi-agent parallel development, and easy integration with e-commerce platforms, SACCOs, and third-party services.

---

## Core Principles

1. **Event-Driven Architecture**

   * All actions are modeled as **commands → events → handlers → projections**.
   * Ensures **deterministic behavior, decoupling, and parallel development**.

2. **Primitives First**

   * Core entities include **Organization, Workspace, Actor, Role, Wallet, Transaction**.
   * Each primitive has its own **commands, events, handlers, Postgres persistence, and Neo4j projections**.

3. **Extensibility**

   * Modules are isolated by folder/namespace.
   * Easy to add new capabilities (e.g., Reality Capture, NLP, Guarantees, Partner APIs) without touching core primitives.
   * **Prompt library** enables AI agents to generate consistent code safely.

4. **Multi-Agent Development**

   * AI agents and human developers can work **in parallel on isolated modules**, with event-driven integration ensuring no conflicts.
   * All AI-generated code is **scaffolded with strict naming conventions and validation**.

5. **Observability & Testing**

   * Unit + integration tests are **mandatory for all modules**.
   * Neo4j projections and event logs allow **real-time visibility** into system state.
   * Wallet and transaction modules enforce **atomicity and financial integrity**.

---

## Project Structure

```
zanafleet/
│
├─ src/
│   ├─ core/
│   │   ├─ events/            # Event definitions & contracts
│   │   ├─ commands/          # Base commands for primitives
│   │   ├─ handlers/          # CommandHandlers / EventHandlers
│   │   ├─ projections/       # Neo4j projection logic
│   │   └─ policies/          # Validation & authorization rules
│   │
│   ├─ modules/               # All domain-specific modules
│   │   ├─ organization/
│   │   ├─ workspace/
│   │   ├─ actor/
│   │   ├─ role/
│   │   ├─ wallet/
│   │   ├─ transaction/
│   │   ├─ reality/
│   │   ├─ nlp_ingress/
│   │   └─ guarantees/
│   │
│   ├─ infra/                 # Infrastructure code
│   │   ├─ eventbus/          # NATS/Redis streams integration
│   │   ├─ persistence/       # Postgres/TypeORM
│   │   └─ graph/             # Neo4j connectivity
│   │
│   ├─ contracts/             # DTOs, Zod validation schemas
│   │   ├─ events/
│   │   └─ commands/
│   │
│   └─ bootstrap/             # Application startup scripts
│
├─ scripts/                   # Database migrations, helper scripts
├─ tests/                     # Unit & integration tests
├─ docs/                      # Design docs, prompt libraries
└─ README.md                  # This file
```

---

## Getting Started

1. **Install Dependencies**

```bash
npm install
```

2. **Start Postgres & Neo4j**

* Postgres: store all core primitives & events
* Neo4j: projection of entities and relationships

3. **Run Event Bus**

```bash
# Example using NATS
nats-server -c ./infra/eventbus/nats-config.conf
```

4. **Run Application**

```bash
npm run start:dev
```

5. **Run Tests**

```bash
npm run test
```

---

## Development Guidelines

* **Naming Conventions**: `<Module>.<Entity>.<Action>V1` for all events
* **Folder Ownership**: Each AI agent or dev works only in assigned module
* **Prompt Library**: Update prompts in `docs/prompts/` to scaffold new modules safely
* **Event Bus Decoupling**: No module directly reads/writes another module’s DB

---

## Extensibility

* **Adding Modules:** Create a new folder under `modules/` with commands, events, handlers, tests, and projections.
* **AI-Assisted Development:** Use prompts to scaffold deterministic, testable code.
* **Neo4j Projections:** Ensure each new module updates the graph to maintain observability.
* **API Integrations:** Expose module commands as API endpoints; map external events to internal commands.

---

## Suggested Tech Stack

* **Backend:** NestJS (TypeScript), FastAPI (Python for NLP ingestion)
* **Database:** Postgres (primitives), Neo4j (graph projections)
* **Event Bus:** NATS or Redis Streams
* **Validation:** Zod (TypeScript)
* **Testing:** Jest (unit), Supertest (integration)
* **AI Integration:** OpenAI GPT / LangChain for code generation and NLP parsing

---

## Sprint Philosophy

* Work in **1-week sprints**: primitives → modules → workflows
* Parallelize **AI agents and devs** on isolated modules
* Validate all events → projections → DB states before moving to next sprint
* Maintain **prompt library** to ensure deterministic code generation

---

## Contributing

* Follow folder/module ownership
* Use the **prompt library** for generating new commands/events/handlers
* Run **unit + integration tests** for all changes
* Document new events/commands in `docs/events.md`

---

## Web Application Features

### UserSettings Extensions

The web application supports optional user settings fields:

- **profileImage**: Optional media reference for user avatar (`mediaAssetId`, `url`)
- **vehicle**: Optional vehicle information with photos (`type`, `make`, `model`, `year`, `color`, `licensePlate`, `photos`)
- **documents**: Optional document uploads (`nationalId`, `driversLicense`)

### Media Upload Flow (MSW Mocked)

Web uploads are mocked via MSW for local development and testing:

- `POST /api/media/assets` – Creates an in-memory media asset record
- `GET /api/media/assets/:id/signed-url` – Returns a `/mock-storage/...` URL and HTTP method
- `PUT /mock-storage/*` – Accepts uploads (no-op in mock)

The Profile page and Settings page use a signed-URL upload flow via `apps/web/src/services/mediaApi.ts`:

1. Create a media asset via `createMediaAsset()`
2. Obtain a signed upload URL via `getSignedUrl(assetId, 'PUT')`
3. Upload the file via `uploadToSignedUrl(url, blob, contentType)`
4. Update user settings with the new media reference

---

## License

MIT – Use, extend, and contribute responsibly.

---

## Notes on Git Submodules for Extensibility

**Pros:**

* Isolates large or optional modules (e.g., NLP, external APIs, partner integrations)
* Independent versioning, CI/CD per module
* Teams or AI agents can work without touching main repo

**Cons:**

* Adds complexity in repo management (cloning, syncing)
* Must ensure submodule events integrate cleanly with main Event Bus

**Recommendation:**

* Core primitives stay in main repo for deterministic foundation
* Submodules for optional/experimental modules
