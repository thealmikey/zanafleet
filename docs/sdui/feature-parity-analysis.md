# SDUI Feature Parity Analysis

## Overview
This document analyzes the feature parity between original TSX components and the SDUI (Server-Driven UI) generated pages.

## TSX Components Analyzed

### 1. HomePage.tsx
**Features:**
- Hero section with gradient background
- Features section with Grid + Cards
- Call-to-Action (CTA) section
- Footer with copyright
- Responsive design (mobile/tablet/desktop breakpoints)
- Navigation links (Get Started, Sign In)

**SDUI Equivalent:**
- ✓ Typography + Box (Hero)
- ✓ Grid + Card + Typography (Features)
- ✓ Box + Button + Typography (CTA)
- ✓ Box + Typography (Footer)
- ✓ Grid breakpoints (Responsive)

**Status:** ✅ FULLY COVERED

---

### 2. SignupWizard.tsx
**Features:**
- Stepper component (horizontal/vertical)
- Multi-step form with validation
- Step navigation (Next/Back)
- Step validation before proceeding
- Loading states
- Error display

**SDUI Equivalent:**
- ✓ Stepper component exists in SDUIRenderer
- ✓ Form validation rules supported
- ✓ Navigation actions (navigate type)
- ✓ ValidationRule schema
- ✓ Loading state handling

**Status:** ✅ FULLY COVERED

---

### 3. SignupWizardContext.tsx
**Features:**
- Session management (sessionId persistence)
- Step tracking (currentStep)
- Form data management
- Progress saving (saveProgress)
- Session recovery
- Finalization flow

**SDUI Equivalent:**
- ⚠️ Partial - DataSource can store state but session mgmt is frontend
- ⚠️ Partial - Step tracking via form state
- ✓ Form data in DataSource
- ✓ API actions for save
- ⚠️ Session recovery requires frontend integration

**Status:** ⚠️ PARTIALLY COVERED (requires frontend integration)

---

### 4. AuthContext.tsx
**Features:**
- Authentication state management
- Keycloak integration
- Token persistence (localStorage)
- Session restore on reload
- Token refresh handling
- Logout flow

**SDUI Equivalent:**
- ⚠️ AuthRequirement metadata in ScreenMetadata
- ⚠️ Protected route handling via auth requirement
- ⚠️ Token storage is external to SDUI
- ⚠️ Session restore requires frontend

**Status:** ⚠️ PARTIALLY COVERED (auth handled at route level)

---

### 5. ProtectedRoute.tsx
**Features:**
- Route protection
- Loading spinner during auth check
- Redirect to login when unauthenticated
- Preserve intended destination

**SDUI Equivalent:**
- ✓ AuthRequirement metadata ('required'|'optional'|'none')
- ⚠️ Redirect logic requires frontend router integration

**Status:** ⚠️ PARTIALLY COVERED (requires router integration)

---

## Component-Level Feature Map

| TSX Component | SDUI Component | Status |
|--------------|----------------|--------|
| Typography | Typography | ✅ |
| Box (with sx) | Box | ✅ |
| Button | Button | ✅ |
| Grid | Grid | ✅ |
| Card | Card | ✅ |
| CardMedia | CardMedia | ✅ |
| Stepper | Stepper | ✅ |
| TextField | TextField | ✅ |
| Select | Select | ✅ |
| Alert | Alert | ✅ |
| CircularProgress | LinearProgress | ✅ |
| Tabs | Tabs | ✅ |
| List | List | ✅ |
| Dialog | Dialog | ✅ |
| Paper | Paper | ✅ |
| Chip | Chip | ✅ |

## Gaps Identified

### 1. Authentication Integration
**Gap:** SDUI has auth metadata but doesn't enforce auth
**Solution:** Frontend router should check ScreenMetadata.auth before rendering

### 2. Session Persistence
**Gap:** SDUI doesn't handle session storage
**Solution:** Frontend context (like AuthContext) handles this, SDUI just receives data

### 3. Complex State Management
**Gap:** Multi-step wizard state needs frontend coordination
**Solution:** Use DataSource with 'derived' type for wizard state

### 4. Conditional Rendering
**Gap:** Some TSX features use complex conditional logic
**Solution:** SDUI supports conditions, verify they work for all cases

## Recommendations

1. **Extend SDUIRenderer** to check auth requirements before rendering
2. **Add wizard state management** to DataSource handling
3. **Verify all conditions** work correctly in Playwright tests
4. **Document SDUI limitations** for complex state interactions

## Test Strategy

Use Playwright to verify:
1. SDUI pages render correctly (existing tests)
2. Stepper navigation works (new tests)
3. Form validation works (existing tests)
4. Auth metadata is respected (new tests)
5. Responsive layouts work (existing tests)