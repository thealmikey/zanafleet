# SDUI Selenium Testing Guide

## Prerequisites

- Node.js 20+
- Chrome/Chromium browser
- ChromeDriver (installed via npm)

## Setup

1. Install dependencies:
   ```bash
   cd apps/web
   npm install
   ```

2. Ensure ports 3000 and 3001 are available

## Running Tests

### Option 1: Using the startup script
```bash
./scripts/run-integration-tests.sh
```

### Option 2: Manual
```bash
# Terminal 1: Start API
cd apps/api
npm run start:dev

# Terminal 2: Start Web
cd apps/web
PORT=3001 npm run start

# Terminal 3: Run tests
cd apps/web
npm run test:e2e
```

## Test Structure

- `tests/e2e/specs/sdui-rendering.spec.ts` - Component rendering tests
- `tests/e2e/specs/sdui-interactions.spec.ts` - User interaction tests
- `tests/e2e/specs/sdui-dynamic.spec.ts` - Dynamic JSON payload tests

## Troubleshooting

- If tests fail, check that both servers are running
- Verify ChromeDriver version matches your Chrome version
- Check console logs in /tmp/ directory