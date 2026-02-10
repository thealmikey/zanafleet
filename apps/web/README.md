# ZanaFleet Web Application

React-based frontend for the ZanaFleet logistics platform.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Development with Mock Service Worker (MSW)

The application uses [MSW](https://mswjs.io/) to intercept and mock API requests during development and testing. This enables full-stack development without requiring the backend API to be running.

### MSW Toggle Behavior

| Environment | Default Behavior | Override |
|-------------|------------------|----------|
| Development (`NODE_ENV=development`) | MSW **enabled** | Set `REACT_APP_USE_MSW=false` to disable |
| Production (`NODE_ENV=production`) | MSW **disabled** | Set `REACT_APP_USE_MSW=true` to enable (e.g., preview deployments) |

### Running with MSW

```bash
# Development mode (MSW enabled by default)
npm start

# Force disable MSW in development
REACT_APP_USE_MSW=false npm start

# Enable MSW in a preview build
REACT_APP_USE_MSW=true npm run build
```

## Test Accounts

The application includes pre-configured test accounts for development and testing. These accounts are recognized by MSW mock handlers and allow testing different user roles without a backend.

### Available Test Accounts

| Role | Email | Dashboard | Tab Labels |
|------|-------|-----------|------------|
| **Admin** | `test-admin@zanafleet.dev` | Admin Dashboard | Metrics, Settlements, Policies |
| **Support** | `test-support@zanafleet.dev` | Support Dashboard | Metrics, Disputes, Refunds, Recent Payments |
| **Rider** | `test-rider@zanafleet.dev` | Rider Dashboard | Active, History, Earnings |
| **Driver** | `test-driver@zanafleet.dev` | Rider Dashboard | Active, History, Earnings |
| **BusinessOwner** | `test-businessowner@zanafleet.dev` | Business Dashboard | Metrics, Orders, Deliveries, Invoices |
| **SaccoAdmin** | `test-saccoadmin@zanafleet.dev` | Operator Dashboard | Metrics, Queue, Candidates, Route |

### Test Password

All test accounts use the same password:

```
testpassword123
```

### Using the DevAccountSwitcher

In development mode, a floating toolbar appears in the bottom-right corner of the screen. This **DevAccountSwitcher** component allows you to:

1. View the currently logged-in user
2. Quickly switch between test accounts
3. See roles assigned to each account

To use:
1. Click the "🧪 Dev" button in the bottom-right corner
2. Select any test account from the dropdown
3. The app will automatically log you in and redirect to the appropriate dashboard

> **Note:** The DevAccountSwitcher only appears when `NODE_ENV !== 'production'`.

### Role-to-Dashboard Mapping

The application routes users to dashboards based on their highest-priority role:

| Role(s) | Dashboard Route |
|---------|-----------------|
| Admin, SiteOwner | `/dashboard/admin` |
| Support | `/dashboard/support` |
| SaccoAdmin, Operator | `/dashboard/operator` |
| BusinessOwner, Business | `/dashboard/business` |
| Rider, Driver | `/dashboard/rider` |

When a user has multiple roles, the highest-priority role determines their default dashboard.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- **Unit tests:** `src/components/**/__tests__/*.spec.tsx`
- **Integration tests:** `src/components/__tests__/app-routing.spec.tsx`
- **Hook tests:** `src/hooks/*.test.tsx`
- **Service tests:** `src/services/*.test.ts`
- **Mock handlers tests:** `src/mocks/__tests__/*.spec.ts`

### Writing Tests with MSW

Tests use `msw/node` to set up a mock server:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Key Test Files

| File | Purpose |
|------|---------|
| `src/components/__tests__/app-routing.spec.tsx` | Integration tests for navigation and role-based routing |
| `src/mocks/__tests__/dashboard-handlers.spec.ts` | Tests for MSW mock handlers |
| `src/pages/*/__tests__/*.spec.tsx` | Dashboard-specific component tests |

## Architecture

### Key Directories

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Generic components (MetricsCard, KPIGrid, etc.)
│   ├── DevAccountSwitcher/  # Development-only account switcher
│   ├── Layout/          # Dashboard layout and navigation
│   └── ProtectedRoute/  # Auth-gated route wrapper
├── contexts/            # React contexts (Auth, SignupWizard)
├── hooks/               # Custom hooks
├── mocks/               # MSW handlers and fixtures
│   ├── fixtures/        # Mock data generators
│   └── handlers.ts      # MSW request handlers
├── pages/               # Page components (dashboards)
├── services/            # API client functions
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

### Protected Routes

All `/dashboard/*` routes are wrapped with `ProtectedRoute`, which:
- Shows a loading spinner while checking authentication
- Redirects unauthenticated users to `/signin`
- Preserves the intended destination for post-login redirect

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Base URL for API requests | `/api` |
| `REACT_APP_USE_MSW` | Force enable/disable MSW | Based on `NODE_ENV` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint |
| `npm run lint:check` | Check linting (CI mode) |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting (CI mode) |
| `npm run type-check` | Run TypeScript type checking |
