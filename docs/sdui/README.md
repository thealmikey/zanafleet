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
| `Chip` | Status indicator | label, color |
| `MetricCard` | Single metric display | label, value, trend, change |
| `KPIGrid` | Grid of KPI metrics | items (array), columns |
| `LineChart` | Line chart (react-chartjs-2) | title, data, height |
| `DoughnutChart` | Doughnut chart (react-chartjs-2) | title, data, height |
| `Tabs` | Tab navigation | tabs (array of strings or {label, value} objects) |
| `DataTable` | Data table | columns, rows |
| `Form` | Form wrapper | method, action |

## Layout Types

| Layout | Description | Props |
|--------|-------------|-------|
| `stack` | Vertical flex container | spacing, maxWidth, padding |
| `flex` | Flexible container with direction | spacing, direction, align, justify, fullHeight, wrap, gridColumn |
| `grid` | CSS Grid layout (MUI Grid) | columns, spacing |
| `root` | Root page container | - |

### Layout GridColumn Support

The `flex` layout supports `gridColumn` prop for nested layouts within a grid:
```json
{
  "type": "flex",
  "props": {
    "gridColumn": "span 8",
    "spacing": 2
  }
}
```

## Testing for Parity

### Running Tests
```bash
# Run SDUI integration tests
cd apps/web
npm test -- --testPathPattern="SDUIRenderer"
```

### Layout Primitive Tests
The integration tests include specific tests for layout primitives:
- `renders grid layout with proper structure` - Verifies Grid container exists
- `renders flex layout with proper structure` - Verifies flexbox behavior
- `renders nested layout structure` - Tests gridColumn span support
- `renders stack layout with proper vertical spacing` - Tests stack layout

### Parity Checklist
When replicating a TSX page in SDUI:

1. **Identify Layout Structure**
   - Original uses Grid? → Use `grid` layout type
   - Original uses Flexbox? → Use `flex` layout type
   - Original uses vertical Stack? → Use `stack` layout type

2. **Match Component Props**
   - Map MUI props to SDUI props
   - Note any custom styling that needs to be replicated

3. **Verify with Tests**
   - Add integration test for the schema
   - Check all components render
   - Verify layout structure matches

4. **Visual Comparison**
   ```bash
   # Compare side by side:
   # Original: http://localhost:3001/dashboard/admin
   # SDUI: http://localhost:3001/sdui/dashboard.admin
   ```

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

### Web Integration Tests
```bash
cd apps/web
npm test -- --testPathPattern="SDUIRenderer"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Each child in a list should have a unique 'key' prop"
**Cause**: Table cells or repeated elements missing unique keys.
**Solution**: The renderer now automatically generates unique keys using indices. If you see this warning, check:
- DataTable components have unique column keys
- Tabs have proper label/value properties

#### 2. "Items on tab menu show text as [Object, Object]"
**Cause**: Tabs defined as objects but rendered as strings.
**Solution**: Use the correct tab format in your schema:
```json
// ❌ Wrong - causes [Object, Object]
{ "tabs": [{ "label": "Overview", "value": "overview" }] }

// ✅ Correct - renderer extracts label
{ "tabs": [{ "label": "Overview", "value": "overview" }] }
// The renderer now properly extracts the 'label' property
```

#### 3. "Unknown component: Form"
**Cause**: Form component not implemented in the renderer.
**Solution**: The Form component is now supported. If you see this warning, ensure you're using a recent version of the renderer.

#### 4. React Router v7 Future Flag Warnings
**Cause**: React Router v7 will change some behaviors.
**Solution**: The app now includes future flags in BrowserRouter:
```typescript
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### Debug Logging

The SDUI renderer includes development-only debug logging:

- **Console debug messages**: `[SDUI] Rendering <ComponentName>` - Shows when components render
- **Warning for unknown components**: `[SDUI] Unknown component: <Type>` - Helps identify missing component implementations
- **Schema loading**: `[SDUIPage] Loaded screen: <screenId>` - Shows schema structure details

To enable verbose logging:
```typescript
// In browser console
localStorage.setItem('DEBUG', 'sdui:*')
```

### Adding New Components

To add a new component type to the renderer:

1. Add the component case in `SDUIRenderer.tsx`:
```typescript
case 'MyComponent':
  return (
    <Box key={key} {...props}>
      {/* Component implementation */}
    </Box>
  );
```

2. Add tests in `SDUIRenderer.integration.spec.tsx`

3. Document in this README

### Component Props Reference

| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| `Logo` | src, alt | height |
| `Typography` | content | variant, align, color |
| `TextField` | name, label | type, required, fullWidth, autoComplete |
| `Button` | content | variant, color, type, fullWidth |
| `Link` | href, content | align |
| `Divider` | - | text |
| `Alert` | severity | content |
| `Card` | - | title, content |
| `Chip` | label | color, size |
| `MetricCard` | label, value | trend, change |
| `Tabs` | tabs (array) | - |
| `DataTable` | columns, rows | dataSource |
| `Form` | - | method, action |

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
