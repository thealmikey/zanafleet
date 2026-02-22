# SDUI Selenium Testing Plan

## Overview
This document outlines the plan to set up Selenium WebDriver testing for the Server-Driven UI (SDUI) components in the ZanaFleet project. The tests will verify dynamic component rendering based on JSON payloads from the API.

## Project Context

### Current State
- **API Server**: NestJS application running on port 3000 (default)
- **Web Client**: React (CRA with Craco) application
- **Existing Tests**: Unit and integration tests using Jest
- **SDUI Implementation**: 
  - API: `apps/api/src/modules/sdui/` - provides screen schemas via JSON
  - Web: `apps/web/src/components/SDUIRenderer/` - renders UI from JSON schemas

### Architecture Flow
```
+------------------+     JSON Schema      +------------------+
|   API Server     | ------------------> |   Web Client     |
|   (Port 3000)    |   /api/sdui/screens |   (Port 3001)   |
+------------------+                     +------------------+
        |                                       |
        v                                       v
+------------------+                     +------------------+
|  Screen JSON     |                     |   Selenium      |
|  Definitions     |                     |   Tests         |
+------------------+                     +------------------+
```

## Step-by-Step Implementation Plan

### Phase 1: Environment Setup

#### Step 1: Install Selenium WebDriver Dependencies
**Location**: `apps/web/package.json`
**Dependencies to add**:
- `selenium-webdriver: ^4.x`
- `chromedriver: ^120.x`

#### Step 2: Configure ChromeDriver
**File**: `apps/web/tests/e2e/config/chromedriver.ts`
- Download matching ChromeDriver version
- Set up Chrome options for headless testing
- Configure WebDriver service

### Phase 2: Server Configuration

#### Step 3: Configure API Server Port
**File**: `.env`
```env
PORT=3000
```
**Current**: Already defaults to 3000 in `apps/api/src/main.ts`

#### Step 4: Configure Web Client Port
**File**: `apps/web/.env.development.local`
```env
PORT=3001
```
**Note**: React uses PORT environment variable

### Phase 3: Test Infrastructure

#### Step 5: Create Test Directory Structure
```
apps/web/tests/
├── e2e/
│   ├── config/
│   │   └── chromedriver.ts
│   ├── fixtures/
│   │   └── sdui-schemas/
│   │       ├── login.screen.json
│   │       └── dashboard.screen.json
│   ├── support/
│   │   └── hooks.ts
│   └── specs/
│       ├── sdui-rendering.spec.ts
│       ├── sdui-interactions.spec.ts
│       └── sdui-validation.spec.ts
```

#### Step 6: Create Selenium WebDriver Configuration
**File**: `apps/web/tests/e2e/config/webdriver.ts`
```typescript
import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export interface TestConfig {
  baseUrl: string;
  apiUrl: string;
  timeout: number;
}

export const config: TestConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  timeout: 30000,
};

export async function createDriver(): Promise<WebDriver> {
  const options = new chrome.Options()
    .headless()
    .addArguments('--no-sandbox')
    .addArguments('--disable-dev-shm-usage')
    .addArguments('--disable-gpu');

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}
```

#### Step 7: Create Test Utilities
**File**: `apps/web/tests/e2e/support/hooks.ts`
```typescript
import { WebDriver, By, until } from 'selenium-webdriver';

export class SDUITestHelper {
  constructor(private driver: WebDriver) {}

  async waitForElement(selector: string, timeout = 10000) {
    return this.driver.wait(until.elementLocated(By.css(selector)), timeout);
  }

  async findElement(selector: string) {
    return this.driver.findElement(By.css(selector));
  }

  async getText(selector: string) {
    const element = await this.findElement(selector);
    return element.getText();
  }

  async click(selector: string) {
    const element = await this.findElement(selector);
    await element.click();
  }

  async type(selector: string, text: string) {
    const element = await this.findElement(selector);
    await element.sendKeys(text);
  }
}
```

#### Step 8: Create Mocha Configuration
**File**: `apps/web/tests/e2e/.mocharc.json`
```json
{
  "timeout": 60000,
  "spec": "tests/e2e/specs/**/*.spec.ts",
  "require": ["ts-node/register", "tests/e2e/support/hooks.ts"],
  "extension": ["ts"],
  "parallel": false
}
```

#### Step 9: Update package.json Scripts
**File**: `apps/web/package.json`
```json
{
  "scripts": {
    "test:e2e": "mocha --config tests/e2e/.mocharc.json",
    "test:e2e:ui": "mocha --config tests/e2e/.mocharc.json --inspect",
    "test:e2e:headed": "mocha --config tests/e2e/.mocharc.json --headed"
  }
}
```

### Phase 4: SDUI Test Cases

#### Step 10: Create SDUI Schema Fixtures
**Files**: 
- `apps/web/tests/e2e/fixtures/sdui-schemas/login.screen.json`
- `apps/web/tests/e2e/fixtures/sdui-schemas/dashboard.screen.json`

These fixtures will mock the API response for testing.

#### Step 11: Component Rendering Tests
**File**: `apps/web/tests/e2e/specs/sdui-rendering.spec.ts`

**Test Cases**:
1. `renders typography component from JSON` - Verify text displays
2. `renders text field components` - Verify form inputs exist
3. `renders button components` - Verify action buttons
4. `renders card components` - Verify content containers
5. `renders data table components` - Verify table structure

#### Step 12: Dynamic JSON Payload Tests
**File**: `apps/web/tests/e2e/specs/sdui-dynamic.spec.ts`

**Test Cases**:
1. `updates UI when JSON payload changes` - Verify dynamic updates
2. `displays correct data from API response` - Verify data binding
3. `handles empty data gracefully` - Verify error handling

#### Step 13: User Interaction Tests
**File**: `apps/web/tests/e2e/specs/sdui-interactions.spec.ts`

**Test Cases**:
1. `can type in text fields` - Verify form input
2. `can click buttons` - Verify action triggering
3. `form validation works` - Verify validation messages
4. `can submit forms` - Verify form submission

### Phase 5: Startup Scripts

#### Step 14: Create Integration Test Runner Script
**File**: `scripts/run-integration-tests.sh`

```bash
#!/bin/bash
set -e

echo "Starting API server on port 3000..."
cd apps/api && npm run start:dev &
API_PID=$!

# Wait for API to be ready
echo "Waiting for API to be ready..."
until curl -s http://localhost:3000/api > /dev/null 2>&1; do
  sleep 2
done

echo "API is ready. Starting web client on port 3001..."
cd apps/web && PORT=3001 npm run start &
WEB_PID=$!

# Wait for web to be ready
echo "Waiting for web client to be ready..."
until curl -s http://localhost:3001 > /dev/null 2>&1; do
  sleep 2
done

echo "Running Selenium tests..."
cd apps/web && npm run test:e2e

# Cleanup
echo "Stopping services..."
kill $API_PID $WEB_PID
```

### Phase 6: Documentation

#### Step 15: Create Testing Guide
**File**: `docs/testing/sdui-selenium-testing.md`

Include:
- Prerequisites
- Setup instructions
- Running tests
- Writing new tests
- Troubleshooting

## Implementation Order

1. Install dependencies (npm install in apps/web)
2. Create test directory structure
3. Create WebDriver configuration
4. Create test utilities
5. Create Mocha configuration
6. Add npm scripts
7. Create fixture files
8. Create test specifications
9. Create startup script
10. Document the setup

## Technical Notes

### Selenium WebDriver Best Practices
- Use explicit waits instead of sleep
- Take screenshots on failure
- Clean up WebDriver after each test
- Use page object pattern for complex pages

### SDUI Testing Strategy
- Test components in isolation using mock API responses
- Verify both positive and negative cases
- Test edge cases (empty data, large datasets)
- Verify accessibility attributes for better selector reliability

### Known Challenges
- Port conflict between API (3000) and web dev server (3000)
- ChromeDriver version matching
- Headless browser limitations
- React's dynamic rendering timing

## Files to Create/Modify

### New Files
- `apps/web/tests/e2e/config/webdriver.ts`
- `apps/web/tests/e2e/config/chromedriver.ts`
- `apps/web/tests/e2e/support/hooks.ts`
- `apps/web/tests/e2e/support/logger.ts`
- `apps/web/tests/e2e/.mocharc.json`
- `apps/web/tests/e2e/fixtures/sdui-schemas/login.screen.json`
- `apps/web/tests/e2e/fixtures/sdui-schemas/dashboard.screen.json`
- `apps/web/tests/e2e/specs/sdui-rendering.spec.ts`
- `apps/web/tests/e2e/specs/sdui-dynamic.spec.ts`
- `apps/web/tests/e2e/specs/sdui-interactions.spec.ts`
- `scripts/run-integration-tests.sh`
- `docs/testing/sdui-selenium-testing.md`

### Modified Files
- `apps/web/package.json` - Add test scripts and dependencies
- `apps/web/.env.development.local` - Set port 3001
- `.env` - Ensure PORT=3000 for API

## Success Criteria

1. API server runs on port 3000
2. Web client runs on port 3001
3. Selenium WebDriver initializes Chrome browser
4. Tests can navigate to SDUI pages
5. Tests verify component rendering from JSON
6. Tests verify user interactions work correctly
7. Tests can be run via npm scripts
8. Startup script handles port conflicts gracefully