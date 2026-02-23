# ZanaFleet Keycloak Integration - Structural Audit & Implementation Plan

**Generated:** 2026-02-23  
**Mode:** Architect  
**Project:** ZanaFleet Monorepo

---

## 1. EXECUTIVE SUMMARY

The ZanaFleet codebase already has **partial Keycloak integration** implemented. The primary task is to:
1. Enable Bearer-only (RS256) token validation as the API's primary authentication method
2. Deprecate the local JWT issuer (`/auth/login` endpoint)
3. Secure WooCommerce endpoints with proper authentication
4. Ensure tenant isolation via `tenant_id` claim

**No major refactoring required** - the existing architecture supports this evolution.

---

## 2. STRUCTURAL AUDIT SUMMARY

### 2.1 Existing Authentication Architecture

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| **AuthModule** | `apps/api/src/modules/auth/auth.module.ts` | ✅ Active | Imports KeycloakConnectModule |
| **JwtStrategy** | `apps/api/src/modules/auth/strategies/jwt.strategy.ts` | ✅ Active | Handles both local + Keycloak tokens |
| **JwtAuthGuard** | `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` | ✅ Active | Passport-based |
| **KeycloakUserSyncService** | `apps/api/src/modules/auth/services/keycloak-user-sync.service.ts` | ✅ Active | Syncs Keycloak users to Actor |
| **SandboxAuthGuard** | `apps/api/src/core/sandbox/sandbox-auth.guard.ts` | ✅ Active | Bypasses auth in sandbox mode |
| **CapabilityGuard** | `apps/api/src/core/api/guards/capability.guard.ts` | ✅ Active | Requires user.actorId, user.workspaceId |
| **PolicyGuard** | `apps/api/src/core/api/guards/policy.guard.ts` | ✅ Active | Policy-based authorization |
| **ApiKeyGuard** | `apps/api/src/core/api/guards/api-key/api-key.guard.ts` | ✅ Available | Not applied to WooCommerce |

### 2.2 API Routing Patterns

| Pattern | Config | Notes |
|---------|--------|-------|
| Global Prefix | `api` | Set in `main.ts` via `app.setGlobalPrefix('api')` |
| Versioning | `/v1` | Enabled via `app.enableVersioning()` |
| Full Path | `/api/v1/{resource}` | Example: `/api/v1/actors` |
| CORS | `localhost:3001` | Currently restricts to frontend origin only |

**Nginx Configuration** (`infra/nginx/nginx.conf`):
- Proxies `/api/` to backend
- Preserves `X-Forwarded-*` headers
- **No token stripping** - Bearer tokens flow through correctly

### 2.3 WooCommerce Authentication

| Endpoint | Current Auth | Risk |
|----------|--------------|------|
| `POST /woocommerce/register` | **NONE** | 🔴 CRITICAL |
| `POST /woocommerce/link` | **NONE** | 🔴 CRITICAL |
| `GET /woocommerce/status/:storeId` | **NONE** | 🔴 CRITICAL |
| `POST /woocommerce/credentials` | **NONE** | 🔴 CRITICAL |

**Note:** `WooCommerceApiKeyService` exists and implements API key management (SHA-256 hashed keys), but is not applied to any controller.

### 2.4 User/Tenant Schema

**ActorEntity** (`apps/api/src/modules/actor/entities/actor.entity.ts`):
```typescript
{
  id: string;           // UUID
  email: string;
  workspaceId: string;  // Tenant identifier
  roles: string[];     // Mapped from Keycloak roles
  type: ActorType;     // Rider, Customer, Business, Admin
}
```

**Current JWT Payload** (from `JwtStrategy`):
```typescript
{
  sub: string;        // actorId
  email: string;
  workspaceId: string;
  roles: string[];
  iss: string;        // 'zanafleet' or Keycloak URL
}
```

**Gap:** No `tenant_id` claim yet - but `workspaceId` serves this purpose.

---

## 3. GAP ANALYSIS

### 3.1 Current vs Required

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Single Realm (zanafleet) | ✅ Configured via `KEYCLOAK_REALM` | None |
| Tenant isolation via tenant_id | ⚠️ Uses `workspaceId` | Rename or add `tenant_id` |
| API as Bearer-only RS256 | ⚠️ Uses HS256 (local) + RS256 (Keycloak) | Enable RS256 only |
| Role-based access (realm + client roles) | ✅ Supported via `KeycloakUserSyncService` | None |
| No session-based auth | ✅ No sessions used | None |
| No login endpoints in NestJS | 🔴 `/auth/login` exists | Deprecate/disable |
| No token issuing in NestJS | 🔴 `/auth/login` issues JWT | Deprecate/disable |

### 3.2 Keycloak Configuration Status

From `.env.example`:
```
KEYCLOAK_REALM=zanafleet
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_CLIENT_ID=zanafleet-api
KEYCLOAK_SECRET=your-keycloak-client-secret
KEYCLOAK_BEARER_ONLY=true
```

From `keycloak.config.ts`:
- Uses `nest-keycloak-connect` 
- `policyEnforcement: PolicyEnforcementMode.PERMISSIVE`
- `tokenValidation: TokenValidation.ONLINE`

---

## 4. RISK ASSESSMENT

### 4.1 Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| WooCommerce endpoints unprotected | 🔴 HIGH | Apply ApiKeyGuard or JwtAuthGuard |
| Local JWT signing (HS256) still active | 🟡 MEDIUM | Disable after Keycloak migration |
| CORS restricts to localhost:3001 only | 🔴 HIGH | Add WooCommerce domain to allowed origins |
| Bearer token not validated for RS256 | 🟡 MEDIUM | Configure Keycloak public key in JwtStrategy |

### 4.2 Compatibility Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing `/auth/login` consumers | MEDIUM | Document deprecation, provide migration path |
| Changing JWT validation secret | MEDIUM | Use Keycloak public key without changing architecture |
| WooCommerce plugin needs OAuth flow | MEDIUM | Document OAuth2/Keycloak client credentials flow |

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Configuration & Token Validation (Minimal Changes)

- [x] **1.1** Update `keycloak.config.ts` to enforce Bearer-only mode with RS256
- [x] **1.2** Add Keycloak public key retrieval to JwtStrategy for RS256 validation
- [x] **1.3** Add `tenant_id` claim support (map from `workspaceId` or add new claim)
- [x] **1.4** Update CORS in `main.ts` to include WooCommerce domain(s)

### Phase 2: WooCommerce Security (High Priority)

- [x] **2.1** Apply `JwtAuthGuard` to WooCommerce controller endpoints
- [x] **2.2** OR apply `ApiKeyGuard` with existing `WooCommerceApiKeyService`
- [x] **2.3** Add WooCommerce domain to CORS allowed origins

### Phase 3: Deprecate Local Auth

- [x] **3.1** Mark `/auth/login` as deprecated (add deprecation header)
- [x] **3.2** Update CapabilityGuard to work with Keycloak token claims
- [x] **3.3** Ensure sandbox mode still works via `SandboxAuthGuard`

### Phase 4: Testing

- [x] **4.1** Unit test: RS256 token validation with mock Keycloak public key
- [x] **4.2** Unit test: JwtAuthGuard with valid/invalid Bearer tokens
- [x] **4.3** Integration test: Protected route with Keycloak token
- [x] **4.4** Integration test: Role-based access (realm + client roles)
- [x] **4.5** Integration test: Tenant isolation (workspaceId claim)
- [x] **4.6** Integration test: 401 vs 403 behavior
- [x] **4.7** Integration test: CORS with WooCommerce origin
- [x] **4.8** Integration test: WooCommerce API key authentication

---

## 6. MINIMAL CODE CHANGES

### 6.1 Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `modules/auth/config/keycloak.config.ts` | Modify | Enforce Bearer-only, RS256 |
| `modules/auth/strategies/jwt.strategy.ts` | Modify | Use Keycloak public key for RS256 |
| `modules/auth/guards/jwt-auth.guard.ts` | Minor | Ensure proper 401 handling |
| `main.ts` | Modify | Update CORS origins |
| `modules/woocommerce/woocommerce-onboarding.controller.ts` | Modify | Add `@UseGuards(JwtAuthGuard)` |
| `.env.example` | Document | Add WooCommerce CORS domains |

### 6.2 Files to Create

| File | Purpose |
|------|---------|
| `modules/auth/guards/keycloak-roles.guard.ts` | Optional: Decorator-based role guard |
| `tests/integration/keycloak-auth.integration.spec.ts` | Full auth flow tests |

---

## 7. TEST COVERAGE STRATEGY

### 7.1 Unit Tests

```typescript
// jwt-strategy.spec.ts
describe('JwtStrategy with RS256', () => {
  it('should validate Keycloak RS256 token using public key');
  it('should reject token with invalid signature');
  it('should extract workspaceId as tenant_id');
  it('should extract realm + client roles');
});

// jwt-auth-guard.spec.ts  
describe('JwtAuthGuard', () => {
  it('should return 401 for missing Bearer token');
  it('should return 401 for invalid/expired token');
  it('should allow request for valid token');
});
```

### 7.2 Integration Tests

```typescript
// keycloak-auth.integration.spec.ts
describe('Keycloak Authentication (E2E)', () => {
  it('should allow access with valid Keycloak Bearer token');
  it('should deny access with missing token (401)');
  it('should deny access with invalid token (401)');
  it('should enforce workspaceId tenant isolation');
  it('should enforce role-based access (403)');
});

// cors.integration.spec.ts
describe('CORS Configuration', () => {
  it('should allow requests from WooCommerce domain');
  it('should reject requests from unknown origins');
});
```

### 7.3 WooCommerce Tests

```typescript
// woo-auth.integration.spec.ts
describe('WooCommerce API Authentication', () => {
  it('should allow access with valid API key');
  it('should deny access without API key (401)');
  it('should deny access with invalid API key (401)');
});
```

---

## 8. SECURITY NOTES

1. **Token Validation:** Use Keycloak's public key (JWKS endpoint) for RS256 validation - do not hardcode
2. **CORS:** Never allow `*` in production; whitelist specific domains
3. **API Keys:** WooCommerce API keys should be rotated periodically; hash stored in DB
4. **Tenant Isolation:** Always verify `workspaceId`/`tenant_id` matches resource being accessed
5. **Logging:** Log authentication failures for security auditing (without logging tokens)

---

## 9. FUTURE EXTENSION NOTES

The architecture supports:
- ✅ Multi-tenant SaaS via `workspaceId` claim
- ✅ Future mobile app (same Keycloak realm)
- ✅ Future marketplace extension (client roles)
- ✅ Admin role expansion (realm roles)
- ✅ Enterprise SSO later (Keycloak handles this)

**No microservices required** - current modular monolith is appropriate.

---

## 10. RECOMMENDED NEXT STEPS

1. **Approve this plan** - Confirm architectural direction
2. **Start Phase 1** - Configure Keycloak RS256 validation
3. **Immediately secure WooCommerce** - Apply authentication guard
4. **Update CORS** - Add allowed origins before deployment
5. **Deprecate /auth/login** - After Keycloak flow is verified

---

*End of Audit Document*
