# Server-Driven UI Migration Implementation Guide
## ZanaFleet - Step-by-Step Implementation

**Version:** 1.0  
**Date:** 2026-02-19

---

## Table of Contents
1. [Step 1: Backend SDUI Infrastructure](#step-1-backend-sdui-infrastructure)
2. [Step 2: Schema Service and Repository](#step-2-schema-service-and-repository)
3. [Step 3: Client SDK Implementation](#step-3-client-sdk-implementation)
4. [Step 4: Login Flow Migration](#step-4-login-flow-migration)
5. [Step 5: Role Navigation Migration](#step-5-role-navigation-migration)

---

## Step 1: Backend SDUI Infrastructure

### 1.1 Create SDUI Module

```typescript
// apps/api/src/modules/sdui/sdui.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SDUIController } from './controllers/sdui.controller';
import { SDUIService } from './services/sdui.service';
import { SchemaRepository } from './repositories/schema.repository';
import { ActionService } from './services/action.service';
import { DataSourceResolver } from './resolvers/data-source.resolver';
import { UISchema } from './entities/ui-schema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UISchema])],
  controllers: [SDUIController],
  providers: [
    SDUIService,
    SchemaRepository,
    ActionService,
    DataSourceResolver,
  ],
  exports: [SDUIService, SchemaRepository],
})
export class SDUIModule {}
```

### 1.2 Create Schema Entity

```typescript
// apps/api/src/modules/sdui/entities/ui-schema.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ui_schemas')
@Index(['screenId', 'version'])
@Index(['screenId', 'role'])
export class UISchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  screenId: string;

  @Column({ default: '1.0' })
  version: string;

  @Column({ nullable: true })
  role: string;

  @Column({ type: 'jsonb' })
  schema: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 1.3 Create SDUI Controller

```typescript
// apps/api/src/modules/sdui/controllers/sdui.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { SDUIService } from '../services/sdui.service';
import { ActionService } from '../services/action.service';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../../../core/auth/decorators/user.decorator';

@Controller('sdui')
@UseGuards(AuthGuard('jwt'))
export class SDUIController {
  constructor(
    private readonly sduiService: SDUIService,
    private readonly actionService: ActionService,
  ) {}

  @Get('screens/:screenId')
  async getScreen(
    @Param('screenId') screenId: string,
    @Query('version') version?: string,
    @Query('context') context?: string,
    @User() user?: any,
  ): Promise<any> {
    const schema = await this.sduiService.getSchema(
      screenId,
      version,
      user,
      context,
    );
    
    if (!schema) {
      throw new NotFoundException(`Screen ${screenId} not found`);
    }
    
    return schema;
  }

  @Post('screens/:screenId/actions/:actionName')
  async executeAction(
    @Param('screenId') screenId: string,
    @Param('actionName') actionName: string,
    @Body() payload: Record<string, any>,
    @Req() req: Request,
    @User() user?: any,
  ): Promise<any> {
    return this.actionService.execute(
      screenId,
      actionName,
      payload,
      user,
      req,
    );
  }

  @Get('navigation')
  async getNavigation(@User() user: any): Promise<any> {
    return this.sduiService.getNavigation(user);
  }
}
```

---

## Step 2: Schema Service and Repository

### 2.1 Schema Repository

```typescript
// apps/api/src/modules/sdui/repositories/schema.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
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

    query.orderBy('schema.role', 'DESC') // Specific role first
      .addOrderBy('schema.version', 'DESC');

    return query.getOne();
  }

  async findAll(): Promise<UISchema[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { screenId: 'ASC', version: 'DESC' },
    });
  }

  async create(data: Partial<UISchema>): Promise<UISchema> {
    const schema = this.repository.create(data);
    return this.repository.save(schema);
  }

  async update(id: string, data: Partial<UISchema>): Promise<UISchema> {
    await this.repository.update(id, data);
    return this.repository.findOneBy({ id });
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }
}
```

### 2.2 SDUI Service

```typescript
// apps/api/src/modules/sdui/services/sdui.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SchemaRepository } from '../repositories/schema.repository';
import { DataSourceResolver } from '../resolvers/data-source.resolver';
import { CachingService } from '../../../core/caching/services/caching.service';

@Injectable()
export class SDUIService {
  private readonly logger = new Logger(SDUIService.name);

  constructor(
    private readonly schemaRepository: SchemaRepository,
    private readonly dataSourceResolver: DataSourceResolver,
    private readonly cachingService: CachingService,
  ) {}

  async getSchema(
    screenId: string,
    version: string | undefined,
    user: any,
    context?: string,
  ): Promise<any> {
    const role = user?.highestRole || 'public';
    const cacheKey = `sdui:${screenId}:${role}:${version || 'latest'}:${context || 'default'}`;

    // Try cache first
    const cached = await this.cachingService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from repository
    const schema = await this.schemaRepository.findByScreenId(
      screenId,
      role,
      version,
    );

    if (!schema) {
      // Try public fallback
      const publicSchema = await this.schemaRepository.findByScreenId(
        screenId,
        'public',
        version,
      );
      
      if (!publicSchema) {
        return null;
      }
      
      return this.personalizeSchema(publicSchema.schema, user, context);
    }

    const personalized = this.personalizeSchema(schema.schema, user, context);

    // Cache the result
    await this.cachingService.set(cacheKey, personalized, { ttl: 300 });

    return personalized;
  }

  private personalizeSchema(
    schema: any,
    user: any,
    context?: string,
  ): any {
    if (!user) {
      return schema;
    }

    // Deep clone to avoid mutation
    const personalized = JSON.parse(JSON.stringify(schema));

    // Inject user context bindings
    if (personalized.data) {
      // Add current user as a data source if not present
      const hasUserSource = personalized.data.some(
        (ds: any) => ds.id === 'currentUser',
      );
      
      if (!hasUserSource) {
        personalized.data.unshift({
          id: 'currentUser',
          type: 'currentUser',
          source: 'user',
        });
      }
    }

    // Apply role-based visibility
    this.applyRoleVisibility(personalized, user.highestRole);

    return personalized;
  }

  private applyRoleVisibility(schema: any, role: string): void {
    // Remove elements not visible to this role
    const processNode = (node: any): boolean => {
      if (!node) return true;

      if (node.roles && !node.roles.includes(role)) {
        return false;
      }

      if (node.children) {
        node.children = node.children.filter(processNode);
      }

      return true;
    };

    processNode(schema.layout);
  }

  async getNavigation(user: any): Promise<any> {
    const role = user?.highestRole || 'public';
    const cacheKey = `sdui:navigation:${role}`;

    const cached = await this.cachingService.get(cacheKey);
    if (cached) return cached;

    const navigation = this.buildNavigation(role);

    await this.cachingService.set(cacheKey, navigation, { ttl: 3600 });

    return navigation;
  }

  private buildNavigation(role: string): any {
    const navConfigs: Record<string, any> = {
      admin: {
        title: 'Admin Dashboard',
        icon: 'admin',
        items: [
          { label: 'Metrics', path: '/dashboard/admin', icon: 'metrics' },
          { label: 'Settlements', path: '/dashboard/admin/settlements', icon: 'settlements' },
          { label: 'Management', path: '/dashboard/admin/management', icon: 'management' },
        ],
      },
      business: {
        title: 'Business Dashboard',
        icon: 'business',
        items: [
          { label: 'Overview', path: '/dashboard/business', icon: 'metrics' },
          { label: 'Deliveries', path: '/dashboard/business/deliveries', icon: 'deliveries' },
          { label: 'Request', path: '/dashboard/business/request', icon: 'add' },
          { label: 'Active', path: '/dashboard/business/active', icon: 'active' },
          { label: 'Billing', path: '/dashboard/business/billing', icon: 'billing' },
        ],
      },
      operator: {
        title: 'Operator Dashboard',
        icon: 'operator',
        items: [
          { label: 'Metrics', path: '/dashboard/operator', icon: 'metrics' },
          { label: 'Queue', path: '/dashboard/operator/queue', icon: 'queue' },
          { label: 'Candidates', path: '/dashboard/operator/candidates', icon: 'riders' },
          { label: 'Route', path: '/dashboard/operator/route', icon: 'route' },
        ],
      },
      rider: {
        title: 'Rider Dashboard',
        icon: 'rider',
        items: [
          { label: 'Active', path: '/dashboard/rider', icon: 'active' },
          { label: 'History', path: '/dashboard/rider/history', icon: 'history' },
          { label: 'Earnings', path: '/dashboard/rider/earnings', icon: 'earnings' },
        ],
      },
    };

    return {
      role,
      ...navConfigs[role],
      common: [
        { label: 'Home', path: '/', icon: 'home' },
        { label: 'Profile', path: '/profile', icon: 'profile' },
        { label: 'Settings', path: '/settings', icon: 'settings' },
        { label: 'Messages', path: '/messages', icon: 'messages' },
      ],
    };
  }
}
```

### 2.3 Action Service

```typescript
// apps/api/src/modules/sdui/services/action.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SchemaRepository } from '../repositories/schema.repository';
import { AuthService } from '../../../modules/auth/auth.service';
import { BusinessService } from '../../../modules/business/business.service';
// Import other services as needed

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  constructor(
    private readonly schemaRepository: SchemaRepository,
    private readonly authService: AuthService,
    private readonly businessService: BusinessService,
    // Add other service dependencies
  ) {}

  async execute(
    screenId: string,
    actionName: string,
    payload: Record<string, any>,
    user: any,
    req: any,
  ): Promise<any> {
    // Get the schema to find action definition
    const schema = await this.schemaRepository.findByScreenId(screenId);
    
    if (!schema) {
      throw new Error(`Screen ${screenId} not found`);
    }

    const action = schema.schema.actions?.find(
      (a: any) => a.name === actionName,
    );

    if (!action) {
      throw new Error(`Action ${actionName} not found on screen ${screenId}`);
    }

    // Execute based on action type
    switch (action.type) {
      case 'submit':
        return this.handleSubmit(action, payload, user, req);
      case 'api':
        return this.handleApiCall(action, payload, user);
      case 'navigate':
        return this.handleNavigate(action, payload);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async handleSubmit(
    action: any,
    payload: any,
    user: any,
    req: any,
  ): Promise<any> {
    const { endpoint, method = 'POST' } = action;

    try {
      // Route to appropriate service based on endpoint
      const result = await this.routeToService(endpoint, method, payload, user);

      return {
        success: true,
        data: result,
        effects: this.buildSuccessEffects(action, result),
      };
    } catch (error) {
      this.logger.error(`Action execution failed: ${error.message}`, error.stack);
      
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code || 'ACTION_FAILED',
        },
        effects: this.buildErrorEffects(action, error),
      };
    }
  }

  private async routeToService(
    endpoint: string,
    method: string,
    payload: any,
    user: any,
  ): Promise<any> {
    // Auth endpoints
    if (endpoint === '/api/auth/login') {
      return this.authService.validateCredentials(payload.email, payload.password);
    }

    // Business endpoints
    if (endpoint.includes('/businesses/') && endpoint.includes('/deliveries')) {
      return this.businessService.createDeliveryRequest(payload);
    }

    // Add more route mappings...

    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  private buildSuccessEffects(action: any, result: any): any[] {
    const effects = [];

    if (action.onSuccess?.navigate) {
      effects.push({
        type: 'navigate',
        path: action.onSuccess.navigate,
      });
    }

    if (action.onSuccess?.showAlert) {
      effects.push({
        type: 'showAlert',
        severity: action.onSuccess.showAlert.type || 'success',
        message: action.onSuccess.showAlert.message,
      });
    }

    if (action.onSuccess?.storeToken && result.token) {
      effects.push({
        type: 'store',
        key: 'token',
        value: result.token,
      });
    }

    return effects;
  }

  private buildErrorEffects(action: any, error: any): any[] {
    const effects = [];

    if (action.onError?.showAlert) {
      effects.push({
        type: 'showAlert',
        severity: 'error',
        message: error.message,
      });
    }

    return effects;
  }

  private async handleApiCall(action: any, payload: any, user: any): Promise<any> {
    // Similar to handleSubmit but for read operations
    return this.routeToService(action.endpoint, action.method || 'GET', payload, user);
  }

  private handleNavigate(action: any, payload: any): any {
    return {
      success: true,
      effects: [
        {
          type: 'navigate',
          path: action.path || payload.redirectTo,
        },
      ],
    };
  }
}
```

---

## Step 3: Client SDK Implementation

### 3.1 SDUI Provider

```typescript
// apps/web/src/sdui/SDUIProvider.tsx
import React, {
  createContext,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import { SDUISchema, ScreenData, ActionResult } from './types';
import { schemaApi } from './api/schemaApi';
import { actionApi } from './api/actionApi';

interface SDUIState {
  schemas: Map<string, SDUISchema>;
  screenData: Map<string, ScreenData>;
  loading: Set<string>;
  errors: Map<string, Error>;
}

type SDUIAction =
  | { type: 'LOAD_SCHEMA_START'; payload: string }
  | { type: 'LOAD_SCHEMA_SUCCESS'; payload: { screenId: string; schema: SDUISchema } }
  | { type: 'LOAD_SCHEMA_ERROR'; payload: { screenId: string; error: Error } }
  | { type: 'LOAD_DATA_START'; payload: string }
  | { type: 'LOAD_DATA_SUCCESS'; payload: { screenId: string; data: ScreenData } }
  | { type: 'LOAD_DATA_ERROR'; payload: { screenId: string; error: Error } }
  | { type: 'CLEAR_ERROR'; payload: string };

const initialState: SDUIState = {
  schemas: new Map(),
  screenData: new Map(),
  loading: new Set(),
  errors: new Map(),
};

function reducer(state: SDUIState, action: SDUIAction): SDUIState {
  switch (action.type) {
    case 'LOAD_SCHEMA_START':
      return {
        ...state,
        loading: new Set([...state.loading, action.payload]),
      };

    case 'LOAD_SCHEMA_SUCCESS': {
      const newSchemas = new Map(state.schemas);
      newSchemas.set(action.payload.screenId, action.payload.schema);
      const newLoading = new Set(state.loading);
      newLoading.delete(action.payload.screenId);
      
      return {
        ...state,
        schemas: newSchemas,
        loading: newLoading,
      };
    }

    case 'LOAD_SCHEMA_ERROR': {
      const newErrors = new Map(state.errors);
      newErrors.set(action.payload.screenId, action.payload.error);
      const newLoading = new Set(state.loading);
      newLoading.delete(action.payload.screenId);
      
      return {
        ...state,
        errors: newErrors,
        loading: newLoading,
      };
    }

    // Similar for data loading...

    default:
      return state;
  }
}

interface SDUIContextValue {
  state: SDUIState;
  loadSchema: (screenId: string, context?: string) => Promise<SDUISchema | null>;
  executeAction: (
    screenId: string,
    actionName: string,
    payload: Record<string, any>
  ) => Promise<ActionResult>;
  getSchema: (screenId: string) => SDUISchema | undefined;
  isLoading: (screenId?: string) => boolean;
  getError: (screenId: string) => Error | undefined;
  clearError: (screenId: string) => void;
}

export const SDUIContext = createContext<SDUIContextValue | null>(null);

interface SDUIProviderProps {
  children: React.ReactNode;
}

export function SDUIProvider({ children }: SDUIProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { token, isAuthenticated } = useAuth();

  const loadSchema = useCallback(
    async (screenId: string, context?: string): Promise<SDUISchema | null> => {
      dispatch({ type: 'LOAD_SCHEMA_START', payload: screenId });

      try {
        const schema = await schemaApi.getScreen(screenId, context, token || undefined);
        dispatch({ type: 'LOAD_SCHEMA_SUCCESS', payload: { screenId, schema } });
        return schema;
      } catch (error) {
        dispatch({
          type: 'LOAD_SCHEMA_ERROR',
          payload: { screenId, error: error as Error },
        });
        return null;
      }
    },
    [token],
  );

  const executeAction = useCallback(
    async (
      screenId: string,
      actionName: string,
      payload: Record<string, any>,
    ): Promise<ActionResult> => {
      dispatch({ type: 'LOAD_SCHEMA_START', payload: `${screenId}:${actionName}` });

      try {
        const result = await actionApi.execute(
          screenId,
          actionName,
          payload,
          token || undefined,
        );
        
        dispatch({
          type: 'LOAD_SCHEMA_SUCCESS',
          payload: { screenId, schema: state.schemas.get(screenId)! },
        });
        
        return result;
      } catch (error) {
        dispatch({
          type: 'LOAD_SCHEMA_ERROR',
          payload: { screenId: `${screenId}:${actionName}`, error: error as Error },
        });
        throw error;
      }
    },
    [token, state.schemas],
  );

  const getSchema = useCallback(
    (screenId: string): SDUISchema | undefined => {
      return state.schemas.get(screenId);
    },
    [state.schemas],
  );

  const isLoading = useCallback(
    (screenId?: string): boolean => {
      if (screenId) {
        return state.loading.has(screenId);
      }
      return state.loading.size > 0;
    },
    [state.loading],
  );

  const getError = useCallback(
    (screenId: string): Error | undefined => {
      return state.errors.get(screenId);
    },
    [state.errors],
  );

  const clearError = useCallback((screenId: string): void => {
    dispatch({ type: 'CLEAR_ERROR', payload: screenId });
  }, []);

  const value: SDUIContextValue = {
    state,
    loadSchema,
    executeAction,
    getSchema,
    isLoading,
    getError,
    clearError,
  };

  return (
    <SDUIContext.Provider value={value}>
      {children}
    </SDUIContext.Provider>
  );
}
```

### 3.2 Schema API Client

```typescript
// apps/web/src/sdui/api/schemaApi.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export const schemaApi = {
  async getScreen(
    screenId: string,
    context?: string,
    token?: string,
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams();
    if (context) {
      params.set('context', context);
    }

    const url = `${API_BASE_URL}/sdui/screens/${screenId}${params.toString() ? `?${params}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return handleResponse(response);
  },

  async getNavigation(token?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/sdui/navigation`, {
      method: 'GET',
      headers,
    });

    return handleResponse(response);
  },
};
```

### 3.3 Action API Client

```typescript
// apps/web/src/sdui/api/actionApi.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

export const actionApi = {
  async execute(
    screenId: string,
    actionName: string,
    payload: Record<string, any>,
    token?: string,
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/sdui/screens/${screenId}/actions/${actionName}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      },
    );

    return handleResponse(response);
  },
};
```

---

## Step 4: Login Flow Migration

### 4.1 Login Schema Definition

```typescript
// apps/api/src/modules/sdui/schemas/auth.login.ts
export const loginSchema = {
  version: '1.0',
  screenId: 'auth.login',
  description: 'User authentication screen',
  data: [],
  layout: {
    type: 'container',
    props: {
      maxWidth: 'sm',
      sx: { mx: 'auto', mt: 8 },
    },
    children: [
      {
        type: 'typography',
        props: {
          variant: 'h4',
          align: 'center',
          gutterBottom: true,
        },
        children: 'ZanaFleet',
      },
      {
        type: 'typography',
        props: {
          variant: 'body2',
          align: 'center',
          color: 'text.secondary',
          sx: { mb: 3 },
        },
        children: 'Sign in to your account',
      },
      {
        type: 'card',
        props: { elevation: 2 },
        children: [
          {
            type: 'form',
            id: 'login-form',
            props: { sx: { p: 3 } },
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
                  autoComplete: 'email',
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
                  autoComplete: 'current-password',
                },
              },
              {
                type: 'button',
                props: {
                  type: 'submit',
                  variant: 'contained',
                  fullWidth: true,
                  sx: { mt: 2, py: 1.5 },
                },
                children: 'Sign In',
              },
            ],
          },
        ],
      },
      {
        type: 'typography',
        props: {
          variant: 'body2',
          align: 'center',
          sx: { mt: 2 },
        },
        children: [
          {
            type: 'link',
            props: { to: '/signup', children: "Don't have an account? Sign up" },
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
        storeToken: 'data.token',
        storeUser: 'data.user',
      },
      onError: {
        showAlert: { type: 'error', message: 'Invalid email or password' },
      },
    },
  ],
  validations: {
    email: {
      type: 'email',
      required: true,
      message: 'Please enter a valid email address',
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      message: 'Password must be at least 8 characters',
    },
  },
};
```

### 4.2 Seed Login Schema

```typescript
// apps/api/src/modules/sdui/seeds/auth.schemas.ts
import { DataSource } from 'typeorm';
import { UISchema } from '../../entities/ui-schema.entity';
import { loginSchema } from '../schemas/auth.login';

export async function seedAuthSchemas(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(UISchema);

  // Check if schemas already exist
  const existing = await repository.findOne({
    where: { screenId: 'auth.login', role: 'public', isActive: true },
  });

  if (!existing) {
    const schema = repository.create({
      screenId: 'auth.login',
      version: '1.0',
      role: 'public',
      schema: loginSchema,
      description: 'User authentication screen',
      isActive: true,
    });

    await repository.save(schema);
    console.log('✓ Seeded auth.login schema');
  }
}
```

---

## Step 5: Role Navigation Migration

### 5.1 Navigation Schema

```typescript
// apps/api/src/modules/sdui/schemas/layout.navigation.ts
export const navigationSchema = {
  version: '1.0',
  screenId: 'layout.navigation',
  data: [
    {
      id: 'currentUser',
      type: 'currentUser',
      source: 'user',
    },
    {
      id: 'notifications',
      type: 'api',
      source: '/api/notifications/unread-count',
      cache: { ttl: 60 },
    },
  ],
  layout: {
    type: 'sidebar',
    props: {
      width: 240,
      collapsible: true,
    },
    children: [
      {
        type: 'roleNav',
        id: 'role-navigation',
        binding: 'currentUser.roles',
        items: {
          admin: {
            title: 'Admin Dashboard',
            icon: 'admin',
            items: [
              { label: 'Metrics', path: '/dashboard/admin', icon: 'metrics' },
              { label: 'Settlements', path: '/dashboard/admin/settlements', icon: 'settlements' },
              { label: 'Management', path: '/dashboard/admin/management', icon: 'management' },
            ],
          },
          support: {
            title: 'Support Dashboard',
            icon: 'support',
            items: [
              { label: 'Metrics', path: '/dashboard/support', icon: 'metrics' },
              { label: 'Disputes', path: '/dashboard/support/disputes', icon: 'disputes' },
              { label: 'Refunds', path: '/dashboard/support/refunds', icon: 'refunds' },
              { label: 'Payments', path: '/dashboard/support/history', icon: 'payments' },
            ],
          },
          operator: {
            title: 'Operator Dashboard',
            icon: 'operator',
            items: [
              { label: 'Metrics', path: '/dashboard/operator', icon: 'metrics' },
              { label: 'Queue', path: '/dashboard/operator/queue', icon: 'queue' },
              { label: 'Candidates', path: '/dashboard/operator/candidates', icon: 'riders' },
              { label: 'Route', path: '/dashboard/operator/route', icon: 'route' },
              { label: 'Assets', path: '/assets', icon: 'fleet' },
            ],
          },
          business: {
            title: 'Business Dashboard',
            icon: 'business',
            items: [
              { label: 'Overview', path: '/dashboard/business', icon: 'metrics' },
              { label: 'Deliveries', path: '/dashboard/business/deliveries', icon: 'history' },
              { label: 'New Request', path: '/dashboard/business/request', icon: 'add' },
              { label: 'Active', path: '/dashboard/business/active', icon: 'active' },
              { label: 'Billing', path: '/dashboard/business/billing', icon: 'billing' },
              { label: 'Fleet Assets', path: '/assets', icon: 'fleet' },
            ],
          },
          rider: {
            title: 'Rider Dashboard',
            icon: 'rider',
            items: [
              { label: 'Active', path: '/dashboard/rider', icon: 'active' },
              { label: 'History', path: '/dashboard/rider/history', icon: 'history' },
              { label: 'Earnings', path: '/dashboard/rider/earnings', icon: 'earnings' },
              { label: 'My Assets', path: '/assets', icon: 'fleet' },
            ],
          },
          shopper: {
            title: 'Shopper Dashboard',
            icon: 'shopper',
            items: [
              { label: 'Overview', path: '/dashboard/shopper', icon: 'metrics' },
              { label: 'Orders', path: '/dashboard/shopper/orders', icon: 'orders' },
              { label: 'Insights', path: '/dashboard/shopper/insights', icon: 'insights' },
            ],
          },
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'navList',
        id: 'common-navigation',
        items: [
          { label: 'Home', path: '/', icon: 'home' },
          { label: 'Profile', path: '/profile', icon: 'profile' },
          { label: 'Settings', path: '/settings', icon: 'settings' },
          { label: 'Messages', path: '/messages', icon: 'messages' },
          { label: 'History', path: '/history', icon: 'history' },
          { label: 'AI Assistant', path: '/ai', icon: 'ai' },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'navList',
        id: 'system-navigation',
        items: [
          {
            label: 'Logout',
            path: '/logout',
            icon: 'logout',
            action: 'auth.logout',
          },
        ],
      },
    ],
  },
  actions: [
    {
      name: 'auth.logout',
      type: 'submit',
      endpoint: '/api/auth/logout',
      method: 'POST',
      onSuccess: {
        navigate: '/',
        clearToken: true,
      },
    },
  ],
};
```

---

## Validation Criteria

### Login Flow Validation

| Criteria | Test | Expected Result |
|----------|------|-----------------|
| Schema loads | GET /api/sdui/screens/auth.login | 200 OK with valid schema |
| Unauthenticated access | GET /api/sdui/screens/auth.login without token | 200 OK (public schema) |
| Action execution | POST /api/sdui/screens/auth.login/actions/auth.login with valid credentials | 200 OK with token and user |
| Invalid credentials | POST with wrong credentials | 401 with error message |
| Navigation after login | On success effect | Redirect to /dashboard |

### Navigation Validation

| Criteria | Test | Expected Result |
|----------|------|-----------------|
| Role-based items | GET /api/sdui/navigation as admin | Admin nav items present |
| Role-based items | GET /api/sdui/navigation as rider | Rider nav items present |
| Common items | Any authenticated user | Home, Profile, Settings present |
| Caching | Second request within 1 hour | Return cached response |

---

*Document Version: 1.0*  
*Last Updated: 2026-02-19*
