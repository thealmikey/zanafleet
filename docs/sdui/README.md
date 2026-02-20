# Server-Driven UI (SDUI)

ZanaFleet's Server-Driven UI system delivers UI definitions as JSON schemas from the backend, allowing for dynamic, server-controlled rendering without client-side business logic.

## Architecture

```
┌─────────────────┐      JSON Schema       ┌──────────────────┐
│   Backend API   │ ──────────────────────▶│   React Web App  │
│  (NestJS)       │                        │  (SDUIRenderer)  │
│                 │                        │                  │
│ ScreenStrategy  │  UISchema              │  Material UI     │
│ - Login        │  - layout              │  Components      │
│ - Dashboard    │  - components          │                  │
│ - etc.         │  - actions             │                  │
└─────────────────┘                        └──────────────────┘
```

## Quick Start - Browser Access

### 1. Start the API server (with seeded data):
```bash
USE_IN_MEMORY_DB=true npm run start:dev
```

### 2. Start the Web app:
```bash
cd apps/web
npm run start
```

### 3. Access in Browser:
Open your browser to:
- **Screen List**: http://localhost:3000/sdui
- **Login Screen**: http://localhost:3000/sdui/login
- **Admin Dashboard**: http://localhost:3000/sdui/dashboard.admin
- **Dispatcher Dashboard**: http://localhost:3000/sdui/dashboard.dispatcher
- **Driver Dashboard**: http://localhost:3000/sdui/dashboard.driver

> Note: The web app runs on port 3001 by default (port 3000 is the API).

### Demo Credentials:
- **Admin**: `admin@zanafleet.test` + any password (6+ chars)
- **Dispatcher**: `dispatcher@zanafleet.test` + any password (6+ chars)
- **Driver**: `driver@zanafleet.test` + any password (6+ chars)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sdui/screens` | List available screens |
| GET | `/api/sdui/screens/:screenId` | Get screen schema |
| POST | `/api/sdui/screens/:screenId/actions/:actionId` | Execute action |
| GET | `/api/sdui/navigation?actorId=` | Get navigation |
| GET | `/api/sdui/health` | Health check |

## JSON Schema Structure

```typescript
interface UISchema {
  version: string;
  screenId: string;
  metadata: {
    title: string;
    description?: string;
    type: ScreenType;
    auth: AuthRequirement;
    allowedRoles?: string[];
  };
  data?: DataSource[];
  layout: LayoutNode;
  actions: ActionDefinition[];
  validations?: ValidationRule[];
}
```

## Component Types

The renderer supports:

| Component | Description | Props |
|-----------|-------------|-------|
| `Logo` | Company/brand logo | src, alt, height |
| `Typography` | Text display | variant, align, content |
| `TextField` | Input field | name, label, type, required |
| `Button` | Action button | variant, color, content |
| `Link` | Navigation link | href, content |
| `Divider` | Visual separator | text |
| `Alert` | Info/warning message | severity, content |
| `Card` | Content container | title, content |

## Layout Types

| Layout | Description |
|--------|-------------|
| `stack` | Vertical flex container |
| `flex` | Flexible container with direction |
| `grid` | CSS Grid layout |
| `root` | Root page container |

## Example - Login Screen Schema

```json
{
  "version": "1.0.0",
  "screenId": "login",
  "metadata": {
    "title": "Sign In",
    "description": "Sign in to your ZanaFleet account",
    "type": "login",
    "auth": "none"
  },
  "layout": {
    "type": "flex",
    "children": [
      {
        "type": "stack",
        "components": [
          { "component": "Typography", "props": { "variant": "h4", "content": "Welcome Back" }},
          { "component": "TextField", "props": { "name": "email", "label": "Email", "type": "email" }},
          { "component": "TextField", "props": { "name": "password", "label": "Password", "type": "password" }},
          { "component": "Button", "props": { "type": "submit", "variant": "contained", "content": "Sign In" }}
        ]
      }
    ]
  },
  "actions": [
    { "id": "submit", "label": "Sign In", "type": "submit", "onSuccess": { "type": "navigate", "target": "/dashboard" }}
  ],
  "validations": [
    { "field": "email", "type": "required" },
    { "field": "email", "type": "email" },
    { "field": "password", "type": "required" },
    { "field": "password", "type": "minLength", "params": { "min": 6 }}
  ]
}
```

## Testing

### API Tests (Backend)
```bash
npm run test -- --testPathPattern="sdui"
```

### Manual Browser Testing
1. Start both API and web app
2. Navigate to http://localhost:3000/sdui
3. Click on any screen to see it rendered
4. Test form submissions and navigation

## Implementation Files

### Backend (API)
- `apps/api/src/modules/sdui/interfaces/sdui.interfaces.ts` - Type definitions
- `apps/api/src/modules/sdui/services/sdui.service.ts` - Screen management
- `apps/api/src/modules/sdui/sdui.controller.ts` - REST endpoints
- `apps/api/src/modules/sdui/strategies/login.screen.ts` - Login screen
- `apps/api/src/modules/sdui/strategies/dashboard.screen.ts` - Dashboards

### Frontend (Web)
- `apps/web/src/types/sdui.types.ts` - Frontend type definitions
- `apps/web/src/services/sduiApi.ts` - API client
- `apps/web/src/components/SDUIRenderer/SDUIRenderer.tsx` - Schema renderer
- `apps/web/src/pages/SDUIPage.tsx` - Browser viewer page
- `apps/web/src/App.tsx` - Routes added at `/sdui/:screenId`
