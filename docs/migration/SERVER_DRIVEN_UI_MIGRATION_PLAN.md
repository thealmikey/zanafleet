# Server-Driven UI Migration Plan
## ZanaFleet React to Server-Driven Architecture

**Author:** Senior Software Architect (20+ years experience)  
**Date:** 2026-02-19  
**Version:** 1.0

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Server-Driven UI Architecture Overview](#server-driven-ui-architecture-overview)
4. [Feature Migration Matrix](#feature-migration-matrix)
5. [Incremental Migration Phases](#incremental-migration-phases)
6. [Backend API Modifications](#backend-api-modifications)
7. [State Management Strategy](#state-management-strategy)
8. [Schema Definitions](#schema-definitions)
9. [Testing Strategy](#testing-strategy)
10. [Performance Optimization](#performance-optimization)
11. [Fallback Mechanisms](#fallback-mechanisms)

---

## 1. Executive Summary

This document outlines a comprehensive migration plan to transform the ZanaFleet React-based web application (`apps/web`) to a server-driven UI (SDUI) architecture. The migration follows the event-driven patterns already established in the backend (`apps/api`), maintaining consistency across the platform.

### Key Benefits of SDUI:
- **Faster initial page loads** - Server delivers pre-rendered UI schemas
- **Consistent UX** - UI changes propagate instantly without client updates
- **Reduced client complexity** - Thin client with minimal business logic
- **Better SEO** - Server-rendered content is indexable
- **Offline capability** - Cached schemas enable offline operation

---

## 2. Current Architecture Analysis

### 2.1 Application Structure

Based on analysis of `apps/web/src/`:

#### State Management (Current)
| Pattern | Usage | Location |
|---------|-------|----------|
| React Context + useReducer | Authentication state | `contexts/AuthContext.tsx` |
| React Context + useReducer | Signup wizard state | `contexts/SignupWizardContext.tsx` |
| Local useState | Component-level state | All pages |
| Custom Hooks | Feature-specific state | `hooks/useAuth.ts` |

#### API Integration Layer
| Service | Purpose | Endpoints |
|---------|---------|-----------|
| `authApi.ts` | Authentication | login, logout, getCurrentUser, profile |
| `signupApi.ts` | User registration | initiateSignup, updateStep, finalizeSignup |
| `dashboardApi.ts` | Role-specific dashboards | metrics, deliveries, billing, queues |
| `geoApi.ts` | Geographic services | nearby riders, route hints |
| `notificationsApi.ts` | Notification management | list, mark read |
| `mediaApi.ts` | Asset management | upload, signed URLs |

#### Component Hierarchy
```
App.tsx
├── AuthProvider
│   ├── SignupWizardProvider (conditional)
│   └── Router
│       ├── PublicRoutes
│       │   ├── HomePage
│       │   └── SignIn
│       └── ProtectedRoutes (per role)
│           ├── DashboardLayout
│           │   ├── RoleNav (admin|support|operator|business|rider|shopper)
│           │   ├── SearchBar
│           │   ├── Notifications
│           │   └── Content
│           │       ├── AdminDashboard
│           │       ├── BusinessDashboard (tabs: overview|deliveries|request|active|billing|customers)
│           │       ├── OperatorDashboard (tabs: metrics|queue|candidates|route)
│           │       ├── RiderDashboard
│           │       ├── SupportDashboard
│           │       ├── Profile
│           │       ├── Settings
│           │       └── ... (20+ pages)
```

### 2.2 Identified Problems (Migration Drivers)

1. **Client-side complexity** - Each dashboard page contains significant business logic
2. **Duplicate validation** - Validation rules exist in both React and need to be mirrored in backend
3. **Inconsistent UI** - Same patterns implemented differently across components
4. **Testing burden** - Complex React components require extensive testing
5. **Slow feature rollout** - UI changes require app store updates

---

## 3. Server-Driven UI Architecture Overview

### 3.1 Core Concepts

The SDUI architecture follows the **Command → Event → Handler → Projection** pattern already established in the backend:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER-DRIVEN UI FLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐   │
│   │  Client  │───▶│  UI Schema   │───▶│  Schema Renderer      │   │
│   │  (Thin)  │◀───│   Endpoint   │◀───│  (React Native)       │   │
│   └──────────┘    └──────────────┘    └───────────────────────┘   │
│        │                                       │                   │
│        │           ┌──────────────┐            │                   │
│        └───────────▶│   Actions    │◀───────────┘                   │
│                    │   (Events)   │                                │
│                    └──────────────┘                                │
│                           │                                         │
│                           ▼                                         │
│                    ┌──────────────┐                                 │
│                    │    API       │                                 │
│                    │  Controllers │                                │
│                    └──────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 UI Schema Structure

Each page/screen is represented by a JSON schema:

```typescript
interface UISchema {
  version: string;
  screenId: string;
  layout: LayoutNode;
  data: DataSource[];
  actions: ActionDefinition[];
  validations: ValidationRule[];
}

interface LayoutNode {
  type: 'container' | 'form' | 'list' | 'card' | 'input' | 'button' | ...;
  props?: Record<string, any>;
  children?: LayoutNode[];
  conditions?: Condition[];
  bindings?: DataBinding[];
}
```

---

## 4. Feature Migration Matrix

### 4.1 Feature Inventory

| Feature | Complexity | Dependencies | Priority |
|---------|------------|--------------|----------|
| Authentication (Login/Logout) | Low | None | P0 |
| Signup Wizard | High | Auth, Session management | P0 |
| Profile Page | Medium | Auth | P1 |
| Role Navigation | Low | Auth, User roles | P0 |
| Search Bar | Low | None | P1 |
| Notifications | Medium | Auth | P1 |
| Business Dashboard Overview | Medium | Auth, Business API | P1 |
| Business Deliveries List | High | Auth, Business API, Filters, Pagination | P1 |
| Business Delivery Request Form | High | Auth, Validation, Location API | P1 |
| Business Billing | Medium | Auth, Billing API | P2 |
| Operator Metrics | Medium | Auth, Operator API | P1 |
| Operator Assignment Queue | High | Auth, Real-time updates | P1 |
| Operator Candidate Discovery | High | Auth, Geo API | P1 |
| Rider Dashboard | Medium | Auth, Rider API | P1 |
| Support Dashboard | Medium | Auth, Support API | P2 |
| Admin Dashboard | Medium | Auth, Admin API | P2 |
| Settings Page | Medium | Auth, Settings API | P2 |

### 4.2 Migration Order (Simplest to Most Complex)

**Phase 1: Foundation (Weeks 1-2)**
1. Login/Logout Flow
2. Role-based Navigation
3. Search Bar
4. Notifications List

**Phase 2: Read-Only Features (Weeks 3-4)**
5. Profile Display
6. Role-specific Metrics (KPIs)
7. Basic Lists with Pagination

**Phase 3: Interactive Features (Weeks 5-6)**
8. Profile Editing
9. Business Delivery Request Form
10. Filters and Advanced Search

**Phase 4: Complex Features (Weeks 7-8)**
11. Signup Wizard
12. Real-time Queue Updates
13. Candidate Discovery with Maps

---

## 5. Incremental Migration Phases

### Phase 1: Foundation Components

#### Step 1.1: Login Flow Migration

**Current Implementation:**
```tsx
// apps/web/src/components/SignIn/SignIn.tsx
const handleSubmit = async (credentials: LoginRequest) => {
  await login(credentials);
  navigate('/dashboard');
};
```

**Target SDUI Schema:**
```json
{
  "version": "1.0",
  "screenId": "auth.login",
  "layout": {
    "type": "container",
    "props": { "maxWidth": "sm", "spacing": 3 },
    "children": [
      {
        "type": "card",
        "children": [
          { "type": "typography", "props": { "variant": "h5", "children": "Sign In" } },
          {
            "type": "form",
            "action": "auth.login",
            "children": [
              {
                "type": "textfield",
                "props": { "name": "email", "label": "Email", "required": true }
              },
              {
                "type": "textfield",
                "props": { "name": "password", "label": "Password", "type": "password", "required": true }
              },
              {
                "type": "button",
                "props": { "type": "submit", "variant": "contained", "children": "Sign In" }
              }
            ]
          }
        ]
      }
    ]
  },
  "actions": [
    {
      "name": "auth.login",
      "type": "submit",
      "endpoint": "/api/auth/login",
      "onSuccess": { "navigate": "/dashboard" }
    }
  ],
  "validations": {
    "email": { "type": "email", "required": true },
    "password": { "type": "string", "required": true, "minLength": 8 }
  }
}
```

**Backend Controller Changes:**
```typescript
// apps/api/src/modules/auth/controllers/sdui.controller.ts (NEW)
@Controller('sdui')
export class SDUIController {
  @Get('screens/:screenId')
  async getScreen(
    @Param('screenId') screenId: string,
    @Req() req: Request,
    @Query('context') context?: string
  ): Promise<UISchema> {
    return this.schemaService.getSchema(screenId, req.user, context);
  }
  
  @Post('screens/:screenId/actions/:actionName')
  async executeAction(
    @Param('screenId') screenId: string,
    @Param('actionName') actionName: string,
    @Body() payload: any,
    @Req() req: Request
  ): Promise<ActionResult> {
    return this.actionService.execute(screenId, actionName, payload, req.user);
  }
}
```

#### Step 1.2: Role Navigation Migration

**Current Implementation:**
```tsx
// apps/web/src/components/Layout/DashboardLayout.tsx
const ROLE_NAV_CONFIG: Record<DashboardRole, { title: string; items: NavItem[] }> = {
  admin: { title: 'Admin Dashboard', items: [...] },
  business: { title: 'Business Dashboard', items: [...] },
  // ...
};
```

**Target SDUI Schema:**
```json
{
  "screenId": "layout.sidebar",
  "layout": {
    "type": "sidebar",
    "props": { "width": 240 },
    "children": [
      {
        "type": "roleNav",
        "binding": "user.roles",
        "items": {
          "admin": { "title": "Admin Dashboard", "icon": "admin", "items": [...] },
          "business": { "title": "Business Dashboard", "icon": "business", "items": [...] },
          "operator": { "title": "Operator Dashboard", "icon": "operator", "items": [...] },
          "rider": { "title": "Rider Dashboard", "icon": "rider", "items": [...] },
          "support": { "title": "Support Dashboard", "icon": "support", "items": [...] },
          "shopper": { "title": "Shopper Dashboard", "icon": "shopper", "items": [...] }
        }
      }
    ]
  },
  "data": [
    { "id": "user", "source": "currentUser" },
    { "id": "notifications", "source": "notifications.unreadCount" }
  ]
}
```

### Phase 2: Read-Only Features

#### Step 2.1: Profile Display

**Current Implementation:**
```tsx
// apps/web/src/pages/Profile/index.tsx
const [name, setName] = useState('');
const [email, setEmail] = useState('');
// ... API calls to getProfile, getSettings
```

**Target SDUI Schema:**
```json
{
  "screenId": "profile.view",
  "layout": {
    "type": "container",
    "children": [
      {
        "type": "card",
        "children": [
          {
            "type": "avatar",
            "binding": "profile.imageUrl",
            "props": { "size": 80, "fallback": "profile.initials" }
          },
          { "type": "typography", "binding": "profile.name", "props": { "variant": "h5" } },
          { "type": "typography", "binding": "profile.email", "props": { "color": "text.secondary" } },
          { "type": "chip", "binding": "profile.roles", "props": { "multiple": true } }
        ]
      }
    ]
  },
  "data": [
    { "id": "profile", "source": "api:/api/user/profile" }
  ]
}
```

#### Step 2.2: Metrics Display (KPIs)

**Current Implementation:**
```tsx
// apps/web/src/pages/OperatorDashboard/index.tsx (MetricsTab)
const kpiItems: KPIGridItem[] = metrics ? [
  { title: 'Active Deliveries', value: metrics.activeDeliveries, ... },
  { title: 'Pending Assignments', value: metrics.pendingAssignments, ... },
  // ...
] : [...];
```

**Target SDUI Schema:**
```json
{
  "screenId": "operator.metrics",
  "data": [
    { 
      "id": "metrics", 
      "source": "api:/api/dashboard/operator/metrics",
      "cache": { "ttl": 60 }
    }
  ],
  "layout": {
    "type": "container",
    "children": [
      {
        "type": "kpiGrid",
        "props": { "columns": 4 },
        "items": [
          {
            "title": "Active Deliveries",
            "binding": "metrics.activeDeliveries",
            "icon": "deliveries",
            "color": "primary"
          },
          {
            "title": "Pending Assignments",
            "binding": "metrics.pendingAssignments",
            "icon": "queue",
            "color": "warning"
          },
          {
            "title": "Available Riders",
            "binding": "metrics.availableRiders",
            "icon": "riders",
            "color": "success"
          },
          {
            "title": "Avg Assignment Time",
            "binding": "metrics.avgAssignmentTime",
            "format": "duration",
            "icon": "timer",
            "color": "secondary"
          }
        ]
      }
    ]
  }
}
```

### Phase 3: Interactive Features

#### Step 3.1: Business Delivery Request Form

**Current Implementation:**
```tsx
// apps/web/src/pages/BusinessDashboard/index.tsx (RequestTab)
const [form, setForm] = useState<BusinessDeliveryRequest>(initialState);
const onSubmit = async (e) => {
  await requestBusinessDelivery(token, businessId, form);
};
```

**Target SDUI Schema:**
```json
{
  "screenId": "business.delivery.request",
  "data": [
    { "id": "locations", "source": "api:/api/locations?businessId={businessId}" },
    { "id": "business", "source": "api:/api/businesses/mine" }
  ],
  "validations": {
    "pickupLocationId": { "type": "string", "required": true },
    "dropoffLocationId": { "type": "string", "required": true },
    "recipientName": { "type": "string", "required": true },
    "recipientPhone": { "type": "string", "required": true, "pattern": "^\\+254" },
    "itemDescription": { "type": "string", "required": true, "maxLength": 500 },
    "declaredItemValue": { "type": "number", "min": 0 },
    "scheduledPickupTime": { "type": "datetime", "min": "now" }
  },
  "layout": {
    "type": "form",
    "action": "business.delivery.create",
    "props": { "method": "post" },
    "children": [
      {
        "type": "grid",
        "props": { "container": true, "spacing": 2 },
        "children": [
          {
            "type": "autocomplete",
            "props": { "name": "pickupLocationId", "label": "Pickup Location", "required": true },
            "dataSource": "locations"
          },
          {
            "type": "autocomplete",
            "props": { "name": "dropoffLocationId", "label": "Dropoff Location", "required": true },
            "dataSource": "locations"
          },
          {
            "type": "textfield",
            "props": { "name": "recipientName", "label": "Recipient Name", "required": true }
          },
          {
            "type": "textfield",
            "props": { "name": "recipientPhone", "label": "Recipient Phone", "required": true }
          },
          {
            "type": "textarea",
            "props": { "name": "itemDescription", "label": "Item Description", "required": true, "rows": 3 }
          },
          {
            "type": "textfield",
            "props": { "name": "scheduledPickupTime", "label": "Scheduled Pickup", "type": "datetime-local" }
          },
          {
            "type": "textfield",
            "props": { "name": "declaredItemValue", "label": "Declared Value", "type": "number" }
          },
          {
            "type": "textfield",
            "props": { "name": "specialInstructions", "label": "Special Instructions", "multiline": true }
          }
        ]
      },
      {
        "type": "button",
        "props": { "type": "submit", "variant": "contained", "children": "Request Delivery" }
      }
    ]
  },
  "actions": [
    {
      "name": "business.delivery.create",
      "type": "submit",
      "endpoint": "/api/businesses/{business.id}/deliveries/request",
      "onSuccess": {
        "showAlert": { "type": "success", "message": "Delivery requested successfully" },
        "resetForm": true,
        "navigate": "/dashboard/business/active"
      },
      "onError": {
        "showAlert": { "type": "error", "message": "{error.message}" }
      }
    }
  ]
}
```

### Phase 4: Complex Features

#### Step 4.1: Signup Wizard

The signup wizard is the most complex feature, involving:
- Multi-step form with progress
- Session management (server-side)
- Conditional fields based on actor type
- Validation per step
- Finalization with user creation

**Target SDUI Schema Structure:**

```json
{
  "screenId": "auth.signup",
  "state": {
    "wizard": {
      "currentStep": { "source": "session.currentStep" },
      "completedSteps": { "source": "session.completedSteps" },
      "actorType": { "source": "session.actorType" },
      "sessionId": { "source": "session.sessionId" }
    }
  },
  "steps": [
    {
      "id": "account-type",
      "layout": {
        "type": "form",
        "action": "signup.step.accountType",
        "children": [
          { "type": "radiogroup", "props": { "name": "actorType", "options": "actorTypes" } },
          { "type": "button", "props": { "type": "submit", "children": "Continue" } }
        ]
      },
      "validations": {
        "actorType": { "type": "enum", "required": true, "values": ["Rider", "Business", "BusinessOwner", "Operator", "Support", "Shopper"] }
      }
    },
    {
      "id": "personal-details",
      "layout": {
        "type": "form",
        "action": "signup.step.personalDetails",
        "children": [
          { "type": "textfield", "props": { "name": "fullName", "required": true } },
          { "type": "textfield", "props": { "name": "nationalId", "required": true } },
          { "type": "textfield", "props": { "name": "location", "required": true } },
          { "type": "textfield", "props": { "name": "email", "type": "email", "required": true } },
          { "type": "textfield", "props": { "name": "phone", "required": true } },
          { "type": "textfield", "props": { "name": "password", "type": "password", "required": true } },
          {
            "type": "conditional",
            "condition": { "field": "actorType", "in": ["Business", "BusinessOwner"] },
            "children": [
              { "type": "textfield", "props": { "name": "businessName", "required": true } }
            ]
          },
          {
            "type": "conditional",
            "condition": { "field": "actorType", "eq": "Rider" },
            "children": [
              { "type": "textfield", "props": { "name": "saccoName" } }
            ]
          }
        ]
      }
    },
    {
      "id": "review",
      "layout": {
        "type": "form",
        "action": "signup.finalize",
        "children": [
          { "type": "summary", "binding": "session.formData" },
          { "type": "button", "props": { "type": "submit", "variant": "contained", "children": "Complete Registration" } }
        ]
      }
    }
  ],
  "navigation": {
    "type": "stepper",
    "steps": ["account-type", "personal-details", "review"],
    "currentStep": { "source": "wizard.currentStep" },
    "completedSteps": { "source": "wizard.completedSteps" }
  }
}
```

---

## 6. Backend API Modifications

### 6.1 New Endpoints Required

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sdui/screens/:screenId` | GET | Get UI schema for a screen |
| `/api/sdui/screens/:screenId/actions/:actionName` | POST | Execute an action |
| `/api/sdui/navigation` | GET | Get navigation structure based on role |
| `/api/sdui/context` | GET | Get current user context for schema customization |

### 6.2 Schema Service

```typescript
// apps/api/src/modules/sdui/sdui.service.ts
@Injectable()
export class SDUIService {
  constructor(
    private schemaRepository: SchemaRepository,
    private actionService: ActionService,
    private cachingService: CachingService,
  ) {}

  async getSchema(screenId: string, user: User, context?: string): Promise<UISchema> {
    const cacheKey = `sdui:${screenId}:${user.highestRole}:${context}`;
    
    const cached = await this.cachingService.get<UISchema>(cacheKey);
    if (cached) return cached;
    
    const baseSchema = await this.schemaRepository.findById(screenId);
    const personalized = this.personalizeSchema(baseSchema, user);
    
    await this.cachingService.set(cacheKey, personalized, { ttl: 300 });
    return personalized;
  }

  private personalizeSchema(schema: UISchema, user: User): UISchema {
    // Inject user-specific data sources
    // Apply role-based visibility conditions
    // Merge user preferences
    return schema;
  }
}
```

### 6.3 Data Source Resolver

```typescript
// apps/api/src/modules/sdui/resolvers/data-source.resolver.ts
@Injectable()
export class DataSourceResolver {
  constructor(
    private dashboardApi: DashboardService,
    private businessApi: BusinessService,
    // ... other services
  ) {}

  async resolve(source: DataSourceDefinition, user: User, params: Record<string, string>): Promise<any> {
    const { type, endpoint, query, cache } = source;
    
    switch (type) {
      case 'api':
        return this.resolveApi(endpoint, user, query, params);
      case 'currentUser':
        return user;
      case 'static':
        return this.resolveStatic(query);
      case 'computed':
        return this.computeValue(query, user);
      default:
        throw new Error(`Unknown data source type: ${type}`);
    }
  }

  private async resolveApi(endpoint: string, user: User, query?: string, params?: Record<string, string>): Promise<any> {
    // Map schema endpoints to actual API calls
    const mapped = this.mapEndpoint(endpoint, params);
    return this.executeApiCall(mapped, user, query);
  }
}
```

---

## 7. State Management Strategy

### 7.1 Client State vs Server State

| State Type | Storage | Invalidation |
|------------|---------|---------------|
| Authentication | HTTP-only cookie + memory | On logout/token expiry |
| User Profile | Server (via schema) | On profile update action |
| Navigation | Server (via schema) | On role change |
| Form Data | Session (server-side) | On step change |
| UI Preferences | LocalStorage | Never (client-only) |
| Cached Lists | Redis + Client cache | TTL-based + push events |

### 7.2 Schema State Machine

```typescript
// Client-side state management
interface SDUIState {
  schemas: Map<string, UISchema>;
  actions: Map<string, ActionResult>;
  errors: Map<string, Error>;
  loading: Set<string>;
  user: User | null;
}

const initialState: SDUIState = {
  schemas: new Map(),
  actions: new Map(),
  errors: new Map(),
  loading: new Set(),
  user: null,
};

function reducer(state: SDUIState, action: SDUIAction): SDUIState {
  switch (action.type) {
    case 'LOAD_SCHEMA_START':
      return { ...state, loading: state.loading.add(action.screenId) };
    case 'LOAD_SCHEMA_SUCCESS':
      return { 
        ...state, 
        schemas: state.schemas.set(action.screenId, action.schema),
        loading: new Set([...state.loading].filter(id => id !== action.screenId))
      };
    case 'LOAD_SCHEMA_ERROR':
      return { 
        ...state, 
        errors: state.errors.set(action.screenId, action.error),
        loading: new Set([...state.loading].filter(id => id !== action.screenId))
      };
    case 'EXECUTE_ACTION_START':
      return { ...state, loading: state.loading.add(action.actionId) };
    case 'EXECUTE_ACTION_SUCCESS':
      return {
        ...state,
        actions: state.actions.set(action.actionId, action.result),
        loading: new Set([...state.loading].filter(id => id !== action.actionId))
      };
    default:
      return state;
  }
}
```

### 7.3 Server-Side Session Management

For complex forms like the signup wizard, session state is managed server-side:

```typescript
// apps/api/src/modules/session/session.service.ts
@Injectable()
export class SessionService {
  async createSession(type: WizardType, actorType: ActorType): Promise<WizardSession> {
    const session = await this.repo.create({
      type,
      actorType,
      currentStep: 0,
      completedSteps: [],
      formData: {},
      expiresAt: addHours(new Date(), 24),
    });
    return session;
  }

  async updateStep(sessionId: string, step: string, data: Partial<FormData>): Promise<WizardSession> {
    const session = await this.repo.findById(sessionId);
    // Validate step transition
    // Update form data
    // Mark step as completed
    return this.repo.save(session);
  }

  async recoverSession(sessionId: string, token: string): Promise<WizardSession | null> {
    const session = await this.repo.findById(sessionId);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    return session;
  }
}
```

---

## 8. Schema Definitions

### 8.1 Core Schema Types

```typescript
// apps/api/src/modules/sdui/types/schema.types.ts

export interface UISchema {
  version: string;
  screenId: string;
  description?: string;
  data?: DataSource[];
  layout: LayoutNode;
  actions: ActionDefinition[];
  validations?: ValidationRule[];
  state?: StateBinding[];
  context?: ContextDefinition[];
}

export interface DataSource {
  id: string;
  type: 'api' | 'currentUser' | 'static' | 'computed';
  source: string;
  params?: Record<string, string>;
  cache?: CacheOptions;
  dependsOn?: string[];
}

export interface LayoutNode {
  type: LayoutType;
  id?: string;
  props?: Record<string, any>;
  children?: LayoutNode[];
  conditions?: Condition[];
  bindings?: DataBinding[];
  dataSource?: string;
}

export type LayoutType = 
  | 'container' | 'grid' | 'box' | 'stack'
  | 'card' | 'paper' | 'dialog' | 'drawer'
  | 'form' | 'section' | 'tabs' | 'stepper'
  | 'list' | 'listItem' | 'table'
  | 'typography' | 'avatar' | 'icon' | 'image'
  | 'textfield' | 'textarea' | 'select' | 'autocomplete' | 'checkbox' | 'radiogroup' | 'switch' | 'datepicker' | 'timepicker'
  | 'button' | 'iconButton' | 'fab' | 'link'
  | 'chip' | 'badge' | 'alert' | 'progress' | 'skeleton'
  | 'map' | 'chart' | 'timeline'
  | 'conditional' | 'repeat';

export interface ActionDefinition {
  name: string;
  type: 'submit' | 'navigate' | 'api' | 'event' | 'custom';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string>;
  body?: Record<string, any>;
  onSuccess?: ActionResponse;
  onError?: ActionResponse;
  confirm?: ConfirmationDialog;
  debounce?: number;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value?: any;
  message?: string;
  severity?: 'error' | 'warning';
}

export interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'and' | 'or';
  value?: any;
}

export interface DataBinding {
  source: string;
  target: string;
  transform?: 'uppercase' | 'lowercase' | 'date' | 'currency' | 'number' | 'boolean' | 'array' | 'object';
  format?: string;
  fallback?: any;
}
```

### 8.2 Example Complete Schema (Login Screen)

```json
{
  "version": "1.0",
  "screenId": "auth.login",
  "description": "User authentication screen",
  "data": [],
  "layout": {
    "type": "container",
    "props": {
      "maxWidth": "sm",
      "sx": { "mx": "auto", "mt": 8 }
    },
    "children": [
      {
        "type": "typography",
        "props": { "variant": "h4", "align": "center", "gutterBottom": true },
        "children": "ZanaFleet"
      },
      {
        "type": "typography",
        "props": { "variant": "body2", "align": "center", "color": "text.secondary", "sx": { "mb": 3 } },
        "children": "Sign in to your account"
      },
      {
        "type": "card",
        "props": { "elevation": 2 },
        "children": [
          {
            "type": "form",
            "props": { "sx": { "p": 3 } },
            "action": "auth.login",
            "children": [
              {
                "type": "textfield",
                "props": {
                  "name": "email",
                  "label": "Email Address",
                  "type": "email",
                  "required": true,
                  "fullWidth": true,
                  "autoComplete": "email",
                  "autoFocus": true
                }
              },
              {
                "type": "textfield",
                "props": {
                  "name": "password",
                  "label": "Password",
                  "type": "password",
                  "required": true,
                  "fullWidth": true,
                  "autoComplete": "current-password"
                }
              },
              {
                "type": "button",
                "props": {
                  "type": "submit",
                  "variant": "contained",
                  "fullWidth": true,
                  "sx": { "mt": 2, "py": 1.5 }
                },
                "children": "Sign In"
              }
            ]
          }
        ]
      },
      {
        "type": "typography",
        "props": { "variant": "body2", "align": "center", "sx": { "mt": 2 } },
        "children": [
          {
            "type": "link",
            "props": { "to": "/signup", "children": "Don't have an account? Sign up" }
          }
        ]
      }
    ]
  },
  "actions": [
    {
      "name": "auth.login",
      "type": "submit",
      "endpoint": "/api/auth/login",
      "method": "POST",
      "onSuccess": {
        "navigate": "/dashboard",
        "storeToken": "response.token"
      },
      "onError": {
        "showAlert": { "type": "error", "message": "Invalid email or password" }
      }
    }
  ],
  "validations": {
    "email": {
      "type": "email",
      "required": true,
      "message": "Please enter a valid email address"
    },
    "password": {
      "type": "string",
      "required": true,
      "minLength": 8,
      "message": "Password must be at least 8 characters"
    }
  }
}
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid for SDUI

```
         ┌─────────────┐
         │    E2E      │  ←  Critical user journeys
         │   Tests     │     (Cypress/Playwright)
         └──────┬──────┘
                │
    ┌───────────┼───────────┐
    │     Integration       │  ←  Schema rendering + Actions
    │       Tests           │     (React Testing Library)
    └───────────┬───────────┘
                │
    ┌───────────┼───────────┐
    │    Unit   │ Service   │  ←  Schema validation
    │   Tests   │  Tests    │     Action execution
    └───────────┴───────────┘     Data source resolution
```

### 9.2 Schema Validation Tests

```typescript
// apps/api/src/modules/sdui/tests/schema-validation.spec.ts
describe('SDUI Schema Validation', () => {
  const validator = new SchemaValidator();
  
  describe('Layout Node Validation', () => {
    it('should validate valid layout structure', () => {
      const schema = validLoginSchema();
      const result = validator.validate(schema);
      expect(result.valid).toBe(true);
    });
    
    it('should reject schema with missing required fields', () => {
      const schema = { version: '1.0', layout: { type: 'container' } };
      const result = validator.validate(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('screenId is required');
    });
    
    it('should validate action endpoints', () => {
      const schema = {
        ...validLoginSchema(),
        actions: [{
          name: 'test',
          type: 'api',
          endpoint: 'invalid endpoint',
        }],
      };
      const result = validator.validate(schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid action endpoint');
    });
  });
  
  describe('Data Source Resolution', () => {
    it('should resolve API data sources', async () => {
      const resolver = new DataSourceResolver(mockServices);
      const result = await resolver.resolve(
        { id: 'test', type: 'api', source: '/api/users' },
        mockUser,
        {}
      );
      expect(result).toEqual(mockUsers);
    });
    
    it('should cache resolved data sources', async () => {
      const resolver = new DataSourceResolver(mockServices);
      await resolver.resolve(dataSource, user, {});
      await resolver.resolve(dataSource, user, {});
      expect(mockCachingService.get).toHaveBeenCalledTimes(2);
    });
  });
});
```

### 9.3 Client Renderer Tests

```tsx
// apps/web/src/sdui/__tests__/schema-renderer.spec.tsx
describe('Schema Renderer', () => {
  const renderSchema = (schema: UISchema) => {
    return render(
      <SDUIProvider schema={schema}>
        <SchemaRenderer />
      </SDUIProvider>
    );
  };
  
  it('should render text field from schema', () => {
    const schema = createSchema({
      layout: {
        type: 'textfield',
        props: { name: 'email', label: 'Email' }
      }
    });
    
    const { getByLabelText } = renderSchema(schema);
    expect(getByLabelText('Email')).toBeInTheDocument();
  });
  
  it('should execute action on form submit', async () => {
    const onAction = jest.fn().mockResolvedValue({ success: true });
    const schema = createSchema({
      layout: {
        type: 'form',
        action: 'submit',
        children: [
          { type: 'textfield', props: { name: 'email', label: 'Email' } },
          { type: 'button', props: { type: 'submit', children: 'Submit' } }
        ]
      },
      actions: [{
        name: 'submit',
        type: 'submit',
        endpoint: '/api/test',
        onSuccess: { navigate: '/success' }
      }]
    });
    
    const { getByText } = renderSchema(schema);
    fireEvent.click(getByText('Submit'));
    
    await waitFor(() => {
      expect(onAction).toHaveBeenCalled();
    });
  });
});
```

---

## 10. Performance Optimization

### 10.1 Caching Strategy

| Resource | Cache Location | TTL | Invalidation |
|----------|---------------|-----|--------------|
| Schema definitions | CDN + Redis | 1 hour | Schema deployment |
| User context | Memory | Session | Role change |
| Dashboard metrics | Redis | 60 seconds | Push update |
| List data | Client cache | 5 minutes | Explicit refresh |
| Static assets | CDN | 24 hours | File change |

### 10.2 Optimized Data Loading

```typescript
// Parallel data fetching with dependent resolution
async function loadScreenData(schema: UISchema, user: User): Promise<ScreenData> {
  const dataSources = schema.data || [];
  
  // Group by dependency level
  const levels = groupByDependency(dataSources);
  
  const results: Record<string, any> = {};
  
  for (const level of levels) {
    const promises = level.map(async (source) => {
      const resolved = await resolveDataSource(source, user, results);
      return { id: source.id, data: resolved };
    });
    
    const levelResults = await Promise.all(promises);
    levelResults.forEach(({ id, data }) => {
      results[id] = data;
    });
  }
  
  return results;
}
```

### 10.3 Client Performance

- **Schema memoization** - Cache rendered components by schema version
- **Lazy hydration** - Only hydrate interactive elements
- **Virtual scrolling** - For large lists
- **Code splitting** - By route and schema complexity

---

## 11. Fallback Mechanisms

### 11.1 Offline Support

```typescript
// Service Worker strategy for offline support
const CACHE_NAME = 'zanafleet-sdui-v1';
const SCHEMA_CACHE = 'zanafleet-schemas-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Schema requests - network first, then cache
  if (url.pathname.startsWith('/api/sdui/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SCHEMA_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
    );
    return;
  }
  
  // Other requests - standard caching
});
```

### 11.2 Error Boundaries

```tsx
// Client-side error boundary
function SchemaErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  if (error.name === 'SchemaValidationError') {
    return (
      <Alert severity="error">
        The application interface is outdated. Please refresh the page.
        <Button onClick={resetError}>Refresh</Button>
      </Alert>
    );
  }
  
  if (error.name === 'NetworkError') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>You're offline. Some features may be unavailable.</Typography>
        <Button onClick={resetError}>Retry</Button>
      </Box>
    );
  }
  
  return (
    <Alert severity="error">
      Something went wrong. Please try again.
      <Button onClick={resetError}>Retry</Button>
    </Alert>
  );
}
```

### 11.3 Graceful Degradation

| Scenario | Fallback Behavior |
|----------|------------------|
| Schema fetch fails | Show cached schema or error screen |
| Action fails | Show error toast, allow retry |
| Data source fails | Show loading skeleton, retry button |
| Offline | Show offline banner, use cached data |
| Version mismatch | Prompt user to refresh |

---

## 12. Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement SDUI controller and service
- [ ] Create schema repository and storage
- [ ] Build basic schema renderer
- [ ] Migrate login/logout flow
- [ ] Implement role navigation

### Phase 2: Read-Only Features (Weeks 3-4)
- [ ] Migrate profile display
- [ ] Migrate metrics/KPIs display
- [ ] Implement data source resolution
- [ ] Add caching layer
- [ ] Build test coverage

### Phase 3: Interactive Features (Weeks 5-6)
- [ ] Migrate profile editing
- [ ] Migrate delivery request form
- [ ] Implement complex validations
- [ ] Add action execution pipeline

### Phase 4: Complex Features (Weeks 7-8)
- [ ] Migrate signup wizard
- [ ] Implement real-time updates
- [ ] Add offline support
- [ ] Performance optimization
- [ ] Full E2E testing

---

## Appendix A: API Response Schemas

### A.1 Screen Schema Response
```json
{
  "version": "1.0",
  "screenId": "auth.login",
  "data": [],
  "layout": { ... },
  "actions": [ ... ],
  "validations": { ... },
  "_meta": {
    "generatedAt": "2026-02-19T12:00:00Z",
    "cacheTTL": 300,
    "schemaHash": "abc123"
  }
}
```

### A.2 Action Response
```json
{
  "success": true,
  "data": { "token": "xxx", "user": { ... } },
  "effects": [
    { "type": "navigate", "path": "/dashboard" },
    { "type": "store", "key": "token", "value": "xxx" }
  ],
  "schema": null
}
```

---

## Appendix B: Component Mapping

| React Component | SDUI Layout Type |
|-----------------|------------------|
| `Box` | `container`, `box` |
| `Grid` | `grid` |
| `Card` | `card` |
| `TextField` | `textfield`, `textarea` |
| `Select` | `select`, `autocomplete` |
| `Button` | `button` |
| `Chip` | `chip` |
| `Alert` | `alert` |
| `Typography` | `typography` |
| `Avatar` | `avatar` |
| `Table` | `table` |
| `List` | `list` |
| `Tabs` | `tabs` |
| `Stepper` | `stepper` |
| `Dialog` | `dialog` |
| `Drawer` | `drawer` |
| `Map` (GeoMap) | `map` |
| `KPIGrid` | `kpiGrid` |

---

*Document Version: 1.0*  
*Last Updated: 2026-02-19*
