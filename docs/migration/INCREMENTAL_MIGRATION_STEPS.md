# Server-Driven UI Migration: Detailed Implementation Steps
## ZanaFleet - Phase-by-Phase Execution Plan

**Version:** 1.0  
**Date:** 2026-02-19

---

## Overview

This document provides detailed, executable steps for migrating the ZanaFleet React application to a server-driven UI architecture. Each step is designed to be a complete, testable unit.

---

## Phase 1: Foundation (Weeks 1-2)

### Step 1.1: Create Backend SDUI Module Structure

**Objective:** Create the core infrastructure for serving UI schemas

**Files to Create:**
```
apps/api/src/modules/sdui/
├── sdui.module.ts
├── entities/
│   └── ui-schema.entity.ts
├── controllers/
│   └── sdui.controller.ts
├── services/
│   ├── sdui.service.ts
│   ├── action.service.ts
│   └── data-source-resolver.service.ts
├── repositories/
│   └── schema.repository.ts
├── schemas/
│   ├── auth.login.ts
│   └── layout.navigation.ts
└── types/
    └── schema.types.ts
```

**Implementation:**

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
}

export interface DataSource {
  id: string;
  type: 'api' | 'currentUser' | 'static' | 'computed';
  source: string;
  cache?: { ttl: number };
}

export interface LayoutNode {
  type: LayoutType;
  id?: string;
  props?: Record<string, any>;
  children?: LayoutNode[];
}

export type LayoutType = 
  | 'container' | 'grid' | 'box' | 'card' | 'form'
  | 'textfield' | 'textarea' | 'select' | 'button'
  | 'typography' | 'avatar' | 'chip' | 'list'
  | 'sidebar' | 'navList' | 'divider' | 'link';

export interface ActionDefinition {
  name: string;
  type: 'submit' | 'api' | 'navigate';
  endpoint?: string;
  method?: string;
  onSuccess?: Record<string, any>;
  onError?: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  type: string;
  required?: boolean;
  message?: string;
  [key: string]: any;
}
```

**Validation Criteria:**
- [ ] Module compiles without errors
- [ ] Entity creates successfully in database
- [ ] Controller endpoints return proper responses

---

### Step 1.2: Create Database Migration for Schemas

**Objective:** Create the database table to store UI schemas

```bash
# Generate migration
cd apps/api
npx typeorm migration:generate -d src/data-source.ts CreateUISchemaTable
```

**Migration Content:**

```typescript
// apps/api/src/migrations/XXX-CreateUISchemaTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUISchemaTable1704067200000 implements MigrationInterface {
  name = 'CreateUISchemaTable1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ui_schemas" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "screen_id" varchar NOT NULL,
        "version" varchar NOT NULL DEFAULT '1.0',
        "role" varchar,
        "schema" jsonb NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_screen_role_version" UNIQUE ("screen_id", "role", "version")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ui_schemas_screen_role" 
      ON "ui_schemas" ("screen_id", "role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ui_schemas"`);
  }
}
```

**Validation Criteria:**
- [ ] Migration runs successfully
- [ ] Table is created with correct constraints
- [ ] Indexes are created for query performance

---

### Step 1.3: Implement Schema Repository and Service

**Objective:** Implement data access layer for UI schemas

```typescript
// apps/api/src/modules/sdui/repositories/schema.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UISchema } from '../entities/ui-schema.entity';

@Injectable()
export class SchemaRepository {
  constructor(
    @InjectRepository(UISchema)
    private readonly repository: Repository<UISchema>,
  ) {}

  async findByScreenId(
    screenId: string,
    role?: string,
    version?: string,
  ): Promise<UISchema | null> {
    const query = this.repository
      .createQueryBuilder('schema')
      .where('schema.screenId = :screenId', { screenId })
      .andWhere('schema.isActive = :isActive', { isActive: true });

    if (version) {
      query.andWhere('schema.version = :version', { version });
    }

    if (role) {
      query.andWhere(
        '(schema.role = :role OR schema.role IS NULL)',
        { role },
      );
    }

    query.orderBy('schema.role', 'DESC')
      .addOrderBy('schema.version', 'DESC')
      .limit(1);

    return query.getOne();
  }

  async save(schema: Partial<UISchema>): Promise<UISchema> {
    const entity = this.repository.create(schema);
    return this.repository.save(entity);
  }
}
```

**Validation Criteria:**
- [ ] Can save a new schema
- [ ] Can retrieve schema by screenId
- [ ] Role-based fallback works correctly

---

### Step 1.4: Create Login Schema Definition

**Objective:** Create the first production schema for the login screen

```typescript
// apps/api/src/modules/sdui/schemas/auth.login.ts
export const loginSchema = {
  version: '1.0',
  screenId: 'auth.login',
  data: [],
  layout: {
    type: 'container',
    props: { maxWidth: 'sm', sx: { mx: 'auto', mt: 8 } },
    children: [
      {
        type: 'typography',
        props: { variant: 'h4', align: 'center', gutterBottom: true },
        children: 'ZanaFleet',
      },
      {
        type: 'typography',
        props: { variant: 'body2', color: 'text.secondary', sx: { mb: 3 } },
        children: 'Sign in to your account',
      },
      {
        type: 'card',
        props: { elevation: 2 },
        children: [
          {
            type: 'form',
            id: 'login-form',
            action: 'auth.login',
            children: [
              {
                type: 'textfield',
                props: {
                  name: 'email',
                  label: 'Email Address',
                  type: 'email',
                  required: true,
                  fullWidth: true,
                  autoFocus: true,
                },
              },
              {
                type: 'textfield',
                props: {
                  name: 'password',
                  label: 'Password',
                  type: 'password',
                  required: true,
                  fullWidth: true,
                },
              },
              {
                type: 'button',
                props: {
                  type: 'submit',
                  variant: 'contained',
                  fullWidth: true,
                  sx: { mt: 2 },
                },
                children: 'Sign In',
              },
            ],
          },
        ],
      },
    ],
  },
  actions: [
    {
      name: 'auth.login',
      type: 'submit',
      endpoint: '/api/auth/login',
      method: 'POST',
      onSuccess: {
        navigate: '/dashboard',
      },
      onError: {
        showAlert: { type: 'error', message: 'Invalid credentials' },
      },
    },
  ],
  validations: {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, minLength: 8 },
  },
};
```

**Validation Criteria:**
- [ ] Schema is valid JSON
- [ ] All required fields are present
- [ ] Action endpoint is correctly mapped

---

### Step 1.5: Create Client SDUI SDK

**Objective:** Build the client-side infrastructure to consume and render schemas

**Files to Create:**
```
apps/web/src/sdui/
├── types/
│   └── schema.types.ts
├── api/
│   ├── schemaApi.ts
│   └── actionApi.ts
├── components/
│   ├── SchemaRenderer.tsx
│   ├── LayoutContainer.tsx
│   ├── FormRenderer.tsx
│   └── BasicInputs.tsx
├── SDUIProvider.tsx
├── useSchema.ts
└── index.ts
```

**Core Implementation:**

```typescript
// apps/web/src/sdui/types/schema.types.ts
export interface UISchema {
  version: string;
  screenId: string;
  description?: string;
  data?: DataSource[];
  layout: LayoutNode;
  actions: ActionDefinition[];
  validations?: Record<string, ValidationRule>;
}

export interface LayoutNode {
  type: string;
  id?: string;
  props?: Record<string, any>;
  children?: LayoutNode[];
  action?: string;
}

export interface ActionDefinition {
  name: string;
  type: 'submit' | 'api' | 'navigate';
  endpoint?: string;
  method?: string;
  onSuccess?: Record<string, any>;
  onError?: Record<string, any>;
}

export interface DataSource {
  id: string;
  type: 'api' | 'currentUser' | 'static';
  source: string;
  cache?: { ttl: number };
}

export interface ValidationRule {
  type: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  message?: string;
  [key: string]: any;
}
```

```typescript
// apps/web/src/sdui/api/schemaApi.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const schemaApi = {
  async getScreen(screenId: string, token?: string): Promise<UISchema> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/sdui/screens/${screenId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`);
    }

    return response.json();
  },
};
```

```tsx
// apps/web/src/sdui/components/BasicInputs.tsx
import React from 'react';
import {
  TextField as MuiTextField,
  Button as MuiButton,
  Typography as MuiTypography,
  Card as MuiCard,
  Box,
} from '@mui/material';

interface InputProps {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  value?: any;
  onChange?: (value: any) => void;
  error?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export function TextField(props: InputProps): React.ReactElement {
  const { name, label, type = 'text', required, fullWidth, value, onChange, error, ...rest } = props;

  return (
    <MuiTextField
      name={name}
      label={label}
      type={type}
      required={required}
      fullWidth={fullWidth}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      error={!!error}
      helperText={error}
      {...rest}
    />
  );
}

export function Button(props: InputProps): React.ReactElement {
  const { children, type = 'button', variant = 'contained', onClick, ...rest } = props;

  return (
    <MuiButton type={type} variant={variant} onClick={onClick} {...rest}>
      {children}
    </MuiButton>
  );
}

export function Typography(props: InputProps): React.ReactElement {
  const { children, variant = 'body1', ...rest } = props;

  return (
    <MuiTypography variant={variant} {...rest}>
      {children}
    </MuiTypography>
  );
}

export function Card(props: InputProps): React.ReactElement {
  const { children, elevation = 0, ...rest } = props;

  return (
    <MuiCard elevation={elevation} {...rest}>
      {children}
    </MuiCard>
  );
}

export function Container(props: InputProps): React.ReactElement {
  const { children, maxWidth, ...rest } = props;

  return (
    <Box sx={{ maxWidth: maxWidth || '100%', mx: 'auto', p: 2, ...rest.props }}>
      {children}
    </Box>
  );
}
```

**Validation Criteria:**
- [ ] Schema API returns valid data
- [ ] Basic components render correctly
- [ ] TypeScript types are correct

---

### Step 1.6: Create Login Screen with Schema Renderer

**Objective:** Replace the current Login component with SDUI renderer

```tsx
// apps/web/src/pages/SDUILogin.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { schemaApi } from '../sdui/api/schemaApi';
import { SchemaRenderer } from '../sdui/components/SchemaRenderer';
import { UISchema } from '../sdui/types/schema.types';

export function SDUILogin(): React.ReactElement {
  const [schema, setSchema] = useState<UISchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSchema(): Promise<void> {
      try {
        const data = await schemaApi.getScreen('auth.login');
        setSchema(data);
      } catch (err) {
        setError('Failed to load login screen');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void loadSchema();
  }, []);

  const handleAction = async (actionName: string, payload: Record<string, any>): Promise<void> => {
    if (actionName === 'auth.login') {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('zanafleet_auth_token', data.token);
          navigate('/dashboard');
        } else {
          setError('Invalid email or password');
        }
      } catch (err) {
        setError('Login failed. Please try again.');
      }
    }
  };

  if (loading) {
    return <Box>Loading...</Box>;
  }

  if (error && !schema) {
    return <Box>Error: {error}</Box>;
  }

  return schema ? (
    <SchemaRenderer
      schema={schema}
      onAction={handleAction}
    />
  ) : (
    <Box>No schema available</Box>
  );
}
```

**Validation Criteria:**
- [ ] Login screen renders from schema
- [ ] Form submission works correctly
- [ ] Navigation after login succeeds

---

## Phase 2: Read-Only Features (Weeks 3-4)

### Step 2.1: Migrate Profile Display

**Schema Definition:**

```typescript
// apps/api/src/modules/sdui/schemas/profile.view.ts
export const profileViewSchema = {
  version: '1.0',
  screenId: 'profile.view',
  data: [
    {
      id: 'profile',
      type: 'api',
      source: '/api/user/profile',
    },
  ],
  layout: {
    type: 'container',
    props: { maxWidth: 600 },
    children: [
      {
        type: 'card',
        children: [
          {
            type: 'box',
            props: { sx: { display: 'flex', alignItems: 'center', gap: 3 } },
            children: [
              {
                type: 'avatar',
                props: {
                  src: '{profile.imageUrl}',
                  sx: { width: 80, height: 80 },
                },
              },
              {
                type: 'box',
                children: [
                  {
                    type: 'typography',
                    props: { variant: 'h5' },
                    binding: 'profile.name',
                  },
                  {
                    type: 'typography',
                    props: { color: 'text.secondary' },
                    binding: 'profile.email',
                  },
                ],
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'box',
            props: { sx: { py: 2 } },
            children: [
              {
                type: 'typography',
                props: { variant: 'subtitle2', color: 'text.secondary' },
                children: 'Roles',
              },
              {
                type: 'chip',
                props: { multiple: true },
                binding: 'profile.roles',
              },
            ],
          },
        ],
      },
    ],
  },
};
```

**Validation Criteria:**
- [ ] Profile data loads from API
- [ ] Avatar displays correctly
- [ ] Roles render as chips

---

### Step 2.2: Migrate Metrics Display

**Schema Definition:**

```typescript
// apps/api/src/modules/sdui/schemas/operator.metrics.ts
export const operatorMetricsSchema = {
  version: '1.0',
  screenId: 'operator.metrics',
  data: [
    {
      id: 'metrics',
      type: 'api',
      source: '/api/dashboard/operator/metrics',
      cache: { ttl: 60 },
    },
  ],
  layout: {
    type: 'container',
    children: [
      {
        type: 'typography',
        props: { variant: 'h6', sx: { mb: 2 } },
        children: 'Operations Overview',
      },
      {
        type: 'grid',
        props: { container: true, spacing: 2 },
        children: [
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 3 },
            children: [
              {
                type: 'card',
                children: [
                  {
                    type: 'cardContent',
                    children: [
                      { type: 'typography', props: { variant: 'body2' }, children: 'Active Deliveries' },
                      {
                        type: 'typography',
                        props: { variant: 'h5' },
                        binding: 'metrics.activeDeliveries',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 3 },
            children: [
              {
                type: 'card',
                children: [
                  {
                    type: 'cardContent',
                    children: [
                      { type: 'typography', props: { variant: 'body2' }, children: 'Pending Assignments' },
                      {
                        type: 'typography',
                        props: { variant: 'h5' },
                        binding: 'metrics.pendingAssignments',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          // ... more KPI cards
        ],
      },
    ],
  },
};
```

---

## Phase 3: Interactive Features (Weeks 5-6)

### Step 3.1: Migrate Business Delivery Request Form

**Schema Definition:**

```typescript
// apps/api/src/modules/sdui/schemas/business.delivery.request.ts
export const deliveryRequestSchema = {
  version: '1.0',
  screenId: 'business.delivery.request',
  data: [
    {
      id: 'locations',
      type: 'api',
      source: '/api/locations',
    },
  ],
  validations: {
    pickupLocationId: { type: 'string', required: true, message: 'Pickup location is required' },
    dropoffLocationId: { type: 'string', required: true, message: 'Dropoff location is required' },
    recipientName: { type: 'string', required: true, message: 'Recipient name is required' },
    recipientPhone: { 
      type: 'string', 
      required: true, 
      pattern: '^\\+254',
      message: 'Phone must start with +254' 
    },
    itemDescription: { type: 'string', required: true, maxLength: 500 },
  },
  layout: {
    type: 'form',
    action: 'business.delivery.create',
    children: [
      {
        type: 'grid',
        props: { container: true, spacing: 2 },
        children: [
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 6 },
            children: [
              {
                type: 'autocomplete',
                props: {
                  name: 'pickupLocationId',
                  label: 'Pickup Location',
                  required: true,
                  options: '{locations}',
                },
              },
            ],
          },
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 6 },
            children: [
              {
                type: 'autocomplete',
                props: {
                  name: 'dropoffLocationId',
                  label: 'Dropoff Location',
                  required: true,
                  options: '{locations}',
                },
              },
            ],
          },
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 6 },
            children: [
              {
                type: 'textfield',
                props: {
                  name: 'recipientName',
                  label: 'Recipient Name',
                  required: true,
                },
              },
            ],
          },
          {
            type: 'grid',
            props: { item: true, xs: 12, md: 6 },
            children: [
              {
                type: 'textfield',
                props: {
                  name: 'recipientPhone',
                  label: 'Recipient Phone',
                  required: true,
                },
              },
            ],
          },
          {
            type: 'grid',
            props: { item: true, xs: 12 },
            children: [
              {
                type: 'textarea',
                props: {
                  name: 'itemDescription',
                  label: 'Item Description',
                  required: true,
                  rows: 3,
                },
              },
            ],
          },
        ],
      },
      {
        type: 'button',
        props: {
          type: 'submit',
          variant: 'contained',
        },
        children: 'Request Delivery',
      },
    ],
  },
  actions: [
    {
      name: 'business.delivery.create',
      type: 'submit',
      endpoint: '/api/businesses/{businessId}/deliveries/request',
      method: 'POST',
      onSuccess: {
        showAlert: { type: 'success', message: 'Delivery requested successfully' },
        resetForm: true,
        navigate: '/dashboard/business/active',
      },
      onError: {
        showAlert: { type: 'error', message: '{error.message}' },
      },
    },
  ],
};
```

**Validation Criteria:**
- [ ] Form validation works client-side
- [ ] Form submission creates delivery
- [ ] Success message displays
- [ ] Navigation happens after success

---

## Phase 4: Complex Features (Weeks 7-8)

### Step 4.1: Migrate Signup Wizard

**Schema Structure:**

```typescript
// apps/api/src/modules/sdui/schemas/auth.signup.ts
export const signupWizardSchema = {
  version: '1.0',
  screenId: 'auth.signup',
  state: {
    sessionId: { source: 'query.sessionId' },
    currentStep: { source: 'session.currentStep' },
    completedSteps: { source: 'session.completedSteps' },
    actorType: { source: 'session.actorType' },
  },
  data: [
    {
      id: 'actorTypes',
      type: 'static',
      source: [
        { value: 'Rider', label: 'Rider' },
        { value: 'Business', label: 'Business' },
        { value: 'BusinessOwner', label: 'Business Owner' },
        { value: 'Operator', label: 'Operator' },
        { value: 'Support', label: 'Support' },
        { value: 'Shopper', label: 'Shopper' },
      ],
    },
  ],
  layout: {
    type: 'stepper',
    props: { activeStep: '{currentStep}' },
    children: [
      {
        id: 'account-type',
        label: 'Account Type',
        layout: {
          type: 'form',
          action: 'signup.step.accountType',
          children: [
            {
              type: 'radiogroup',
              props: {
                name: 'actorType',
                options: '{actorTypes}',
                required: true,
              },
            },
            {
              type: 'button',
              props: { type: 'submit', variant: 'contained' },
              children: 'Continue',
            },
          ],
        },
      },
      {
        id: 'personal-details',
        label: 'Personal Details',
        layout: {
          type: 'form',
          action: 'signup.step.personalDetails',
          children: [
            {
              type: 'textfield',
              props: { name: 'fullName', label: 'Full Name', required: true },
            },
            {
              type: 'textfield',
              props: { name: 'nationalId', label: 'National ID', required: true },
            },
            {
              type: 'textfield',
              props: { name: 'location', label: 'Location', required: true },
            },
            {
              type: 'textfield',
              props: { name: 'email', label: 'Email', type: 'email', required: true },
            },
            {
              type: 'textfield',
              props: { name: 'phone', label: 'Phone', required: true },
            },
            {
              type: 'textfield',
              props: { name: 'password', label: 'Password', type: 'password', required: true },
            },
            {
              type: 'conditional',
              condition: { field: 'actorType', in: ['Business', 'BusinessOwner'] },
              children: [
                {
                  type: 'textfield',
                  props: { name: 'businessName', label: 'Business Name', required: true },
                },
              ],
            },
            {
              type: 'button',
              props: { type: 'submit', variant: 'contained' },
              children: 'Continue',
            },
          ],
        },
      },
      {
        id: 'review',
        label: 'Review',
        layout: {
          type: 'form',
          action: 'signup.finalize',
          children: [
            {
              type: 'summary',
              binding: 'session.formData',
            },
            {
              type: 'button',
              props: { type: 'submit', variant: 'contained' },
              children: 'Complete Registration',
            },
          ],
        },
      },
    ],
  },
  actions: [
    {
      name: 'signup.step.accountType',
      type: 'submit',
      endpoint: '/api/signup/{sessionId}',
      method: 'PATCH',
      body: { stepName: 'account-type' },
    },
    {
      name: 'signup.step.personalDetails',
      type: 'submit',
      endpoint: '/api/signup/{sessionId}',
      method: 'PATCH',
      body: { stepName: 'personal-details' },
    },
    {
      name: 'signup.finalize',
      type: 'submit',
      endpoint: '/api/signup/{sessionId}/finalize',
      method: 'POST',
      onSuccess: {
        navigate: '/dashboard',
      },
    },
  ],
};
```

---

## Component Mapping Reference

### Material UI to SDUI Type Mapping

| Material UI Component | SDUI Type | Props Mapping |
|----------------------|-----------|---------------|
| `Box` | `container`, `box` | `sx` → `props.sx` |
| `Grid` (container) | `grid` | `container`, `spacing` |
| `Grid` (item) | `grid` | `item`, `xs`, `md`, etc. |
| `Card` | `card` | `elevation` |
| `CardContent` | `cardContent` | - |
| `TextField` | `textfield` | `name`, `label`, `type`, `required` |
| `TextField (multiline)` | `textarea` | `rows` |
| `Select` | `select`, `autocomplete` | `options` |
| `Button` | `button` | `variant`, `color`, `type` |
| `Chip` | `chip` | `label`, `color` |
| `Typography` | `typography` | `variant`, `color` |
| `Avatar` | `avatar` | `src`, `alt` |
| `Alert` | `alert` | `severity` |
| `Divider` | `divider` | - |
| `List` | `list` | - |
| `ListItem` | `listItem` | - |
| `Link` | `link` | `to`, `href` |
| `Stepper` | `stepper` | `activeStep` |
| `Tabs` | `tabs` | `value` |
| `Dialog` | `dialog` | `open`, `onClose` |

---

## Error Handling Strategy

### Client-Side Error States

```typescript
// Error boundary for schema rendering
interface SchemaErrorState {
  type: 'network' | 'validation' | 'schema' | 'action';
  message: string;
  retryAction?: () => void;
}

// Fallback UI for each error type
const errorFallbacks: Record<SchemaErrorState['type'], React.ReactNode> = {
  network: (
    <Alert severity="error">
      You're offline. Please check your connection.
      <Button onClick={retry}>Retry</Button>
    </Alert>
  ),
  validation: (
    <Alert severity="warning">
      Please correct the errors in the form.
    </Alert>
  ),
  schema: (
    <Alert severity="error">
      The interface is outdated. Please refresh.
      <Button onClick={refreshSchema}>Refresh</Button>
    </Alert>
  ),
  action: (
    <Alert severity="error">
      {error.message}
      <Button onClick={retryAction}>Try Again</Button>
    </Alert>
  ),
};
```

---

## Testing Checklist

### Unit Tests

- [ ] Schema validation (all fields required)
- [ ] Data source resolution
- [ ] Action routing
- [ ] Cache behavior

### Integration Tests

- [ ] Schema endpoint returns correct data
- [ ] Action execution flow
- [ ] Role-based navigation

### E2E Tests

- [ ] Login flow end-to-end
- [ ] Form submission and validation
- [ ] Navigation after action

---

*Document Version: 1.0*  
*Last Updated: 2026-02-19*
