Dev Account Switcher: Local Test Workflow (MSW)

Overview
- No external DB/API required. All network calls are intercepted by MSW and backed by an in-memory store implemented in src/mocks/handlers.ts.
- Seeding logic for auth derives from TEST_ACCOUNTS (and TEST_PASSWORD) exported by @zanafleet/contracts. Selecting an email from this list logs in with the shared test password.
- Test infra is auto-bootstrapped by CRA/Jest via src/setupTests.ts. It starts the MSW server, resets handlers and in-memory state between tests, and provides a localStorage mock.

Details
1) No external DB/API required — MSW provides in-memory state via src/mocks/handlers.ts.
   - The handlers define endpoints for signup and auth under /api/**.
   - In-memory state includes:
     - Signup sessions Map (created/updated per request)
     - Current user and token (mutated on login/logout)
   - This removes the need for a running backend or database during frontend tests.

2) Seeding logic derives from TEST_ACCOUNTS in @zanafleet/contracts.
   - The login handler looks up accounts by email against TEST_ACCOUNTS and validates TEST_PASSWORD.
   - Source of truth: packages/contracts/src/test-accounts.ts (consumed via the @zanafleet/contracts workspace package).
   - The DevAccountSwitcher component uses TEST_PASSWORD to perform login for the selected test account.

3) Test infra is auto-bootstrapped by src/setupTests.ts (MSW listen/reset + localStorage mock).
   - CRA automatically loads src/setupTests.ts before tests.
   - What it does:
     - server.listen() before all tests, server.resetHandlers() after each, server.close() after all
     - resetMockSessions() clears MSW in-memory state after each test
     - Mocks window.localStorage and polyfills crypto.randomUUID for Node test env

4) Commands
   - Build contracts once: npm run build --workspace @zanafleet/contracts
   - Run all frontend tests: npm run test --workspace zanafleet-frontend -- --watchAll=false
   - Run only the switcher test: npm run test --workspace zanafleet-frontend -- DevAccountSwitcher.msw

Notes
- apps/web/package.json already runs a contracts build during pretest, but running the standalone build once (as above) ensures the @zanafleet/contracts artifacts are up-to-date before test runs from the repo root.
- The DevAccountSwitcher test asserts login flow (loading, token persistence, current user display/roles highlighting) and error behavior (401 banner with dismiss).
