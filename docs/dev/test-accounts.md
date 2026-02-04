# Test Accounts for Development

This document describes the test account seeding feature for local development and testing.

## Overview

ZanaFleet provides pre-seeded test accounts to help developers quickly test the application with different user roles without going through the signup flow. This feature is **development and test mode only** and is completely disabled in production.

## Available Test Accounts

All test accounts use the password: `testpassword123`

| Username | Email | Type | Roles | Workspace |
|----------|-------|------|-------|-----------|
| test-admin | test-admin@zanafleet.dev | Admin | Admin, SiteOwner | None (global) |
| test-support | test-support@zanafleet.dev | Support | Support | Test Workspace |
| test-rider | test-rider@zanafleet.dev | Rider | Rider | Test Workspace |
| test-driver | test-driver@zanafleet.dev | Driver | Driver | Test Workspace |
| test-businessowner | test-businessowner@zanafleet.dev | BusinessOwner | BusinessOwner | Test Workspace |
| test-saccoadmin | test-saccoadmin@zanafleet.dev | SaccoAdmin | SaccoAdmin | Test Workspace |

**Test Workspace ID:** `550e8400-e29b-41d4-a716-446655440000`

## Using the Dev Account Switcher

When running the web app in development mode (`npm run dev`), a floating toolbar appears in the bottom-right corner of every page:

1. **Click the "🧪 Dev" button** to open the account switcher panel
2. **View current user** - Shows the currently logged-in user (if any) with their roles
3. **Select a test account** - Click any account to log in immediately
4. **Role badges** - Each account shows its type and assigned roles
5. **Close** - Click outside the panel or use the close button

The switcher is only visible in development mode and automatically hidden in production builds.

## How the Backend Seeder Works

The `TestAccountSeederService` in the API module automatically seeds test accounts on application startup:

1. **Environment Check**: Only runs when `NODE_ENV !== 'production'`
2. **Idempotent**: Checks if each account already exists (by email) before creating
3. **Password Hashing**: Uses bcrypt (10 rounds) to hash the test password
4. **Direct Repository Access**: Bypasses command/event handlers for efficiency
5. **Logging**: Reports which accounts were created vs. skipped

**Location:** `apps/api/src/modules/actor/services/test-account-seeder.service.ts`

### Startup Behavior

When the API starts in dev/test mode:
```
[TestAccountSeeder] Seeding test accounts...
[TestAccountSeeder] Created: test-admin@zanafleet.dev
[TestAccountSeeder] Skipped (exists): test-support@zanafleet.dev
[TestAccountSeeder] Test account seeding complete: 1 created, 5 skipped
```

## Web App Mock Handlers

For frontend testing without a running API, MSW (Mock Service Worker) handlers recognize test accounts:

- **POST /api/auth/login** - Validates test account credentials
- **GET /api/auth/me** - Returns user info from mock token

**Location:** `apps/web/test/mocks/handlers.ts`

## Security Notes

⚠️ **IMPORTANT: Development Only**

- Test accounts are **NEVER** seeded in production (`NODE_ENV === 'production`)
- The `DevAccountSwitcher` component returns `null` in production builds
- All test account definitions are in `packages/contracts/src/test-accounts.ts`
- The fixed password `testpassword123` should **never** be used for real accounts
- MSW mock handlers are only active in test environments

### Verification

To confirm test features are disabled in production:

1. Build for production: `npm run build`
2. Start production server
3. Verify: No floating toolbar appears
4. Verify: Test account emails cannot log in

## Shared Contract

Test account definitions are shared between API and web:

```typescript
import { TEST_ACCOUNTS, TEST_PASSWORD, TEST_WORKSPACE_ID } from '@zanafleet/contracts';
```

This ensures consistency between backend seeding and frontend mock handlers.

## Troubleshooting

### Account switcher not appearing
- Verify you're running in development mode (`npm run dev`)
- Check browser console for errors
- Ensure `NODE_ENV` is not set to `'production'`

### Login fails with test account
- API: Verify the seeder ran (check startup logs)
- Web tests: Ensure MSW is started in test setup

### Accounts not seeded
- Check API logs for seeder output
- Verify database connection
- Confirm `NODE_ENV !== 'production'`
