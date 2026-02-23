# OpenAPI / Swagger Documentation Audit Report

**Project:** ZanaFleet NestJS Monorepo  
**Date:** 2026-02-23  
**Auditor:** Architect Mode  

---

## Executive Summary

The ZanaFleet API has **minimal OpenAPI/Swagger documentation** despite having the `@nestjs/swagger` package installed. The infrastructure is not initialized in `main.ts`, resulting in **no production-ready API docs** being served.

| Category | Status |
|----------|--------|
| Swagger Module Initialization | ❌ Missing |
| Controller Coverage | ⚠️ Partial (3/34 = 8.8%) |
| DTO Coverage | ⚠️ Partial |
| JWT Auth Representation | ❌ Missing |
| WorkspaceId Enforcement Docs | ❌ Missing |
| Security Scheme Definition | ❌ Missing |

---

## 1. Swagger Module Initialization

### ✅ Status: NOT IMPLEMENTED

**Location:** [`apps/api/src/main.ts`](apps/api/src/main.ts)

**Finding:**
- `@nestjs/swagger` v7.0.0 is installed in `package.json` (line 55)
- **No** `SwaggerModule` or `DocumentBuilder` is imported or used
- **No** Swagger UI is served at any endpoint

**Code Gap:**
```typescript
// MISSING - main.ts should include:
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... existing config ...
  
  // ADD THIS:
  const config = new DocumentBuilder()
    .setTitle('ZanaFleet API')
    .setDescription('AI-accelerated, event-driven last-mile logistics platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
```

---

## 2. Controller Documentation Coverage

### ⚠️ Status: PARTIAL (8.8% Coverage)

**Total Controllers:** 34  
**With @ApiTags:** 3  

| Controller | Route | @ApiTags | @ApiOperation | Status |
|------------|-------|----------|---------------|--------|
| AuthController | `/auth` | ✅ | ❌ | ⚠️ Partial |
| SearchController | `/search` | ✅ | ✅ | ⚠️ Partial |
| DeliveryTrackingController | `/deliveries/track` | ✅ | ✅ | ⚠️ Partial |
| ActorController | `/actors` | ❌ | ❌ | ❌ Missing |
| BusinessController | `/businesses` | ❌ | ❌ | ❌ Missing |
| CapabilityController | `/capabilities` | ❌ | ❌ | ❌ Missing |
| RiderController | `/riders` | ❌ | ❌ | ❌ Missing |
| WorkspaceController | `/workspaces` | ❌ | ❌ | ❌ Missing |
| OrderController | `/orders` | ❌ | ❌ | ❌ Missing |
| DeliveryController | `/deliveries` | ❌ | ❌ | ❌ Missing |
| PaymentController | `/payments` | ❌ | ❌ | ❌ Missing |
| DashboardControllers | 6 variants | ❌ | ❌ | ❌ Missing |
| SaccoController | `/saccos` | ❌ | ❌ | ❌ Missing |
| NotificationController | `/notifications` | ❌ | ❌ | ❌ Missing |
| Other Controllers | ~15 more | ❌ | ❌ | ❌ Missing |

**Locations:**
- Controllers: [`apps/api/src/modules/*/controllers/*.ts`](apps/api/src/modules)
- Auth: [`apps/api/src/modules/auth/controllers/auth.controller.ts`](apps/api/src/modules/auth/controllers/auth.controller.ts:11)
- Search: [`apps/api/src/modules/search/controllers/search.controller.ts`](apps/api/src/modules/search/controllers/search.controller.ts:9)
- Delivery Tracking: [`apps/api/src/modules/delivery/controllers/delivery-tracking.controller.ts`](apps/api/src/modules/delivery/controllers/delivery-tracking.controller.ts:148)

---

## 3. DTO Documentation Coverage

### ⚠️ Status: PARTIAL

**DTOs WITH Swagger decorators (partial):**
- ✅ `CreateLocationDto` - [`apps/api/src/core/location/location.dto.ts`](apps/api/src/core/location/location.dto.ts)
- ✅ `LocationResponseDto` - same file
- ✅ `CreateBusinessDto` - [`apps/api/src/modules/business/dto/create-business.dto.ts`](apps/api/src/modules/business/dto/create-business.dto.ts)
- ✅ `BusinessResponseDto` - [`apps/api/src/modules/business/dto/business-response.dto.ts`](apps/api/src/modules/business/dto/business-response.dto.ts)
- ✅ `CreateRiderDto` - [`apps/api/src/modules/rider/dto/create-rider.dto.ts`](apps/api/src/modules/rider/dto/create-rider.dto.ts)
- ✅ `RiderResponseDto` - [`apps/api/src/modules/rider/dto/rider-response.dto.ts`](apps/api/src/modules/rider/dto/rider-response.dto.ts)
- ✅ `LoginDto` / `LoginResponseDto` - [`apps/api/src/modules/auth/dto/login.dto.ts`](apps/api/src/modules/auth/dto/login.dto.ts)
- ✅ `KeycloakTokenDto` - [`apps/api/src/modules/auth/dto/keycloak-token.dto.ts`](apps/api/src/modules/auth/dto/keycloak-token.dto.ts)
- ✅ `ActorResponseDto` - [`apps/api/src/modules/actor/dto/actor-response.dto.ts`](apps/api/src/modules/actor/dto/actor-response.dto.ts)
- ✅ Various SignUp DTOs - [`apps/api/src/modules/signup/dto/`](apps/api/src/modules/signup/dto/)

**⚠️ Issue:** Many DTOs exist WITHOUT any `@ApiProperty` decorators:
- Dashboard DTOs
- Payment DTOs
- Order DTOs
- Settlement DTOs
- Most nested/complex DTOs in delivery module

---

## 4. JWT Authentication Representation

### ❌ Status: NOT DOCUMENTED

**Finding:**
- **No** `@ApiBearerAuth()` decorator found anywhere in codebase
- **No** security scheme defined in OpenAPI spec
- JWT is used via `CapabilityGuard` but not documented

**Current Auth Guards (undocumented in Swagger):**
- `CapabilityGuard` - [`apps/api/src/core/api/guards/capability.guard.ts`](apps/api/src/core/api/guards/capability.guard.ts)
- `JwtAuthGuard` - Used in WooCommerce controller only
- `PolicyGuard` - [`apps/api/src/core/api/guards/policy.guard.ts`](apps/api/src/core/api/guards/policy.guard.ts)

**Code Fragility:** Controllers use `@UseGuards(CapabilityGuard)` but this isn't reflected in the API docs. Consumers won't know authentication is required.

---

## 5. WorkspaceId Enforcement Representation

### ❌ Status: NOT DOCUMENTED

**Finding:**
- **No** `@ApiHeader` decorators for `workspaceId`
- **No** documentation of workspace-scoped access
- Many controllers extract `workspaceId` from `req.user` but this is invisible in API docs

**Example of undocumented workspace scoping:**
```typescript
// From search.controller.ts - workspaceId extracted but not documented
const user = req.user as { workspaceId?: string; businessId?: string } | undefined;
const workspaceId = user?.workspaceId ?? user?.businessId ?? '00000000-0000-0000-0000-000000000000';
```

**Locations where workspaceId is used but not documented:**
- [`apps/api/src/modules/search/controllers/search.controller.ts`](apps/api/src/modules/search/controllers/search.controller.ts:38)
- [`apps/api/src/modules/dashboard/controllers/*.controller.ts`](apps/api/src/modules/dashboard/controllers)
- [`apps/api/src/modules/delivery/controllers/deliveries.controller.ts`](apps/api/src/modules/delivery/controllers/deliveries.controller.ts)

---

## 6. Missing Domain Modules / Incomplete Documentation

### ❌ Status: CRITICAL GAPS

**Entire Modules WITHOUT Any Swagger Decorators:**

| Module | Controllers | DTOs | Impact |
|--------|-------------|------|--------|
| `calendar` | 0 | 0 | High - scheduling APIs |
| `policy` | 0 | 0 | High - authorization |
| `workflow` | 0 | 0 | High - business workflows |
| `ledger` | 0 | 0 | Critical - financial |
| `settlement` | 0 | 0 | Critical - financial |
| `billing` | 0 | 0 | Critical - financial |
| `incentive` | 0 | 0 | Medium - rider incentives |
| `transaction` | 0 | 0 | Critical - financial |
| `evidence` | 0 | 0 | Medium - audit trail |
| `interaction` | 0 | 0 | Low - analytics |
| `commitments` | 0 | 0 | Medium - SLAs |
| `role` | 0 | 0 | Medium - RBAC |
| `persona` | 0 | 0 | Medium - user types |
| `ai` | 0 | 0 | Low - AI services |
| `agents` | 0 | 0 | Low - agent runtime |

---

## 7. Fragility & Risk Analysis

| Issue | Severity | Description |
|-------|----------|-------------|
| No centralized auth docs | 🔴 High | Consumers can't discover required auth |
| WorkspaceId not documented | 🔴 High | Multi-tenancy enforcement invisible |
| Partial DTO coverage | 🟡 Medium | Incomplete type info in generated clients |
| No versioned API docs | 🟡 Medium | v1 prefix exists but not reflected in Swagger |
| No deprecation notices | 🟡 Medium | Auth endpoint marked deprecated in headers but not in docs |
| No response schemas | 🟡 Medium | Most endpoints lack @ApiResponse decorators |

---

## 8. Recommendations

### Minimal Changes for Production-Ready Docs

1. **Initialize Swagger Module** (Priority: Critical)
   - Add `DocumentBuilder` and `SwaggerModule` to `main.ts`
   - Configure base security scheme (`addBearerAuth`)

2. **Add Security Documentation** (Priority: Critical)
   - Add `@ApiBearerAuth()` to all protected controllers
   - Add `@ApiHeader` for workspaceId where required

3. **Add Controller Decorators** (Priority: High)
   - Add `@ApiTags()` to all 34 controllers
   - Add `@ApiOperation()` summaries to key endpoints

4. **Complete DTO Coverage** (Priority: High)
   - Add `@ApiProperty()` to all DTOs without decorators
   - Add `@ApiPropertyOptional()` for optional fields

5. **Add Response Schemas** (Priority: Medium)
   - Add `@ApiResponse({ type: XxxResponseDto })` to endpoints

6. **Document Workspace Scoping** (Priority: High)
   - Add header documentation for workspaceId enforcement
   - Document the default workspace behavior

---

## Summary Matrix

| Requirement | Status | Location/Note |
|-------------|--------|----------------|
| Swagger Setup | ❌ Missing | `main.ts` - not initialized |
| Controller Coverage | ⚠️ 8.8% (3/34) | Only auth, search, delivery-track |
| DTO Coverage | ⚠️ Partial | ~25% have decorators |
| JWT Auth Docs | ❌ Missing | No `@ApiBearerAuth` |
| WorkspaceId Docs | ❌ Missing | No `@ApiHeader` |
| Security Scheme | ❌ Missing | Not defined |
| Module Gaps | ❌ 15+ modules | No docs for calendar, policy, ledger, etc. |

---

## Next Steps

To achieve production-ready API documentation:

1. **Immediate:** Initialize Swagger in `main.ts`
2. **High Priority:** Add `@ApiBearerAuth()` and security scheme
3. **High Priority:** Add `@ApiTags()` to all controllers
4. **Medium Priority:** Complete DTO decorator coverage
5. **Medium Priority:** Add workspaceId header documentation

This audit reveals that while the codebase has scattered Swagger decorators, the **API documentation infrastructure is not operational**. The `@nestjs/swagger` package is installed but not configured, leaving 91% of controllers undocumented.