# Contact Graph Ingestion & Multi-Faceted Report Generation Architecture

## Executive Summary

This document defines the architecture for two foundational platform capabilities:

1. **Contact Graph Ingestion System** - Transform raw contact data into intelligent graph relationships
2. **Multi-Faceted Report Generation Engine** - Role-aware, workspace-scoped analytics with cross-workspace aggregation

Both systems operate within ZanaFleet's multi-workspace, multi-vertical job orchestration platform where users have multiple roles (rider, mover, admin, customer) across different workspaces.

---

## PART 1: CONTACT GRAPH INGESTION SYSTEM

### A. Contact Entity Model

#### Core Contact Entity

```
┌─────────────────────────────────────────────────────────────────┐
│                        Contact Entity                           │
├─────────────────────────────────────────────────────────────────┤
│ id: UUID                                                        │
│ workspaceId: UUID | null  // null = global contact             │
│ source: ContactSource enum (DEVICE, CSV, CRM, EMAIL, BULK)   │
│ externalId: string  // ID from source system                   │
│                                                                 │
│ // Identity Fields                                              │
│ displayName: string                                            │
│ phoneNumbers: string[]                                         │
│ emailAddresses: string[]                                       │
│ companyName: string | null                                     │
│ notes: string | null                                          │
│                                                                 │
│ // Relationship Context                                         │
│ contactType: ContactType enum                                  │
│   - RIDER: Platform worker                                      │
│   - CUSTOMER: End consumer                                      │
│   - BUSINESS: Partner business                                  │
│   - SUPPLIER: Supply chain partner                              │
│   - REFERRAL: Referred contact                                  │
│   - UNCLASSIFIED: Needs review                                  │
│                                                                 │
│ relationshipStrength: number (0-100)                           │
│ lastInteractionAt: timestamp | null                            │
│ referralSourceId: UUID | null                                  │
│                                                                 │
│ // Matching & Deduplication                                     │
│ matchedUserId: UUID | null  // If matched to platform user     │
│ mergeGroupId: UUID | null  // For deduplicated contacts        │
│ confidenceScore: number                                        │
│ isVerified: boolean                                            │
│                                                                 │
│ metadata: JSONB  // Source-specific data                       │
│ createdAt, updatedAt: timestamps                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Workspace-Scoped vs Global Contacts

| Aspect     | Global Contact                  | Workspace-Scoped           |
| ---------- | ------------------------------- | -------------------------- |
| Scope      | Platform-wide                   | Single workspace           |
| Visibility | Cross-workspace                 | Workspace-bound            |
| Use Case   | Rider profiles, partner network | Business-specific contacts |
| Privacy    | Requires consent                | Workspace isolation        |
| Matching   | Always attempted                | Workspace-specific         |

#### Relationship Types (Graph Edges)

```
RELATIONSHIP_TYPES = {
  // User-to-User
  RIDER_OF: { from: User, to: Workspace, properties: { since, role } },
  EMPLOYEE_OF: { from: User, to: Business },
  CUSTOMER_OF: { from: User, to: Business },
  PARTNER_OF: { from: Business, to: Business },
  SUPPLIER_OF: { from: Business, to: Business },

  // Referral Chain
  REFERRED_BY: { from: User, to: User, properties: { referralCode, reward } },
  REFERRAL_SOURCE: { from: Contact, to: User },

  // Workspace Relationships
  MEMBER_OF: { from: User, to: Workspace },
  ADMIN_OF: { from: User, to: Workspace },
  WORKER_IN: { from: User, to: Workspace },

  // Interaction-based (auto-generated)
  FREQUENTLY_INTERACTS_WITH: { from: User, to: User, properties: { count, lastAt } },
  SHARES_RIDERS_WITH: { from: Business, to: Business, properties: { riderCount } }
}
```

---

### B. Import Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CONTACT IMPORT PIPELINE                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐     │
│  │  Source  │───▶│   Parsing   │───▶│Normalization│───▶│ Dedupe &  │     │
│  │  Ingest  │    │    Layer    │    │    Layer    │    │  Matching  │     │
│  └──────────┘    └─────────────┘    └──────────────┘    └────────────┘     │
│       │                                                        │            │
│       ▼                                                        ▼            │
│  ┌─────────┐                                           ┌────────────┐     │
│  │  Raw    │                                           │   Smart    │     │
│  │ Contact │                                           │Suggestions │     │
│  │  Store  │                                           └────────────┘     │
│  └─────────┘                                                  │            │
│       │                                                      ▼            │
│       ▼                                            ┌─────────────────┐     │
│  ┌──────────────────────┐                          │     Graph      │     │
│  │   Canonical Contact   │────────────────────────▶│   Enrichment   │     │
│  │      Store           │                          └─────────────────┘     │
│  └──────────────────────┘                                    │            │
│       │                                                      ▼            │
│       ▼                                            ┌─────────────────┐     │
│  ┌──────────────────┐                              │    Manual      │     │
│  │   Relationship   │────────────────────────────▶│    Review     │     │
│  │   Inference      │                              │    Queue      │     │
│  └──────────────────┘                              └─────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### B.1 Parsing Layer

```typescript
// Source-specific parsers
interface ContactParser {
  parse(raw: RawSourceData): ParsedContact[];
  validate(raw: RawSourceData): ValidationResult;
}

// Supported formats
PARSERS = {
  DEVICE: DeviceContactParser, // Mobile contacts sync
  CSV: CsvContactParser, // Bulk upload
  CRM: CrmExportParser, // CRM exports (HubSpot, Salesforce)
  EMAIL: EmailAddressBookParser, // Email contacts
  VCF: VCardParser, // vCard format
  JSON: JsonContactParser, // API imports
};
```

#### B.2 Normalization Layer

```typescript
interface ContactNormalizer {
  normalizePhone(phone: string): NormalizedPhone;
  normalizeEmail(email: string): NormalizedEmail;
  normalizeName(name: string): NormalizedName;
  extractCompany(contact: ParsedContact): CompanyInfo;
}

// Phone normalization rules
NORMALIZATION_RULES = {
  stripNonNumeric: true,
  countryCodeDefault: '+254', // Kenya default
  formatE164: true,
  dedupeCountryPrefix: true,
};
```

#### B.3 Deduplication Strategy

```
DEDUPLICATION ALGORITHM:
========================

1. Blocking Keys (fast elimination)
   - Same phone number hash
   - Same email domain + first name
   - Same company name (normalized)

2. Similarity Scoring (candidate pairs)
   - Levenshtein distance on names
   - Jaccard similarity on phone sets
   - Email domain + local part match

3. Confidence Thresholds
   - 95%: Auto-merge
   - 70-95%: Suggest merge
   - <70%: New contact creation

4. Merge Rules
   - Prefer non-null values
   - Keep most recent updates
   - Preserve all source IDs
   - Aggregate relationship scores
```

#### B.4 Matching Logic

```
MATCHING HIERARCHY:
===================

1. Exact Match (100% confidence)
   - Phone number exact match
   - Email exact match (case-insensitive)
   - Platform user ID reference

2. Fuzzy Match (70-99% confidence)
   - Phone number with 1 digit difference
   - Name similarity > 80%
   - Company + name combination

3. Inference Match (50-70% confidence)
   - Shared phone with existing contact
   - Same email domain as business
   - IP correlation (for device imports)

4. No Match (< 50%)
   - Create new contact
   - Flag for relationship inference
```

#### B.5 Conflict Resolution & Manual Override

```typescript
interface ConflictResolution {
  // Auto-resolve rules
  resolveContactConflicts(contacts: Contact[]): ConflictResolutionResult;

  // Manual override flow
  createReviewQueue(workspaceId: UUID): ReviewQueue;
  approveMerge(mergeId: UUID, userId: UUID): void;
  rejectMerge(mergeId: UUID, reason: string): void;
}

// UI Friction Minimization
MANUAL_OVERRIDE = {
  // Single-click approval
  showSuggestion + accept button

  // Batch operations
  "Apply to all similar"

  // Undo capability
  "Revert" available for 7 days

  // No dead ends
  Always allow "Skip" or "Create New"
}
```

---

### C. Relationship Graph Model

#### Neo4j Graph Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEO4J GRAPH MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  (:User {id, role, profile})                                              │
│       │                                                                    │
│       ├──────────────────────────────────────┐                            │
│       │                                      │                            │
│       ▼                                      ▼                            │
│  [:MEMBER_OF]──▶ (:Workspace)          [:WORKER_IN]──▶ (:Workspace)      │
│       │                  │                      │                 │       │
│       │                  │                      │                 │       │
│       ▼                  ▼                      ▼                 ▼       │
│  (:Business)      (:Organization)      (:Job)           (:Branch)         │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  (:Contact)─────────────[:MATCHED_TO]──────────────▶(:User)              │
│       │                                                                   │
│       ├──[:HAS_PHONE]───▶(:PhoneNumber {normalized, isVerified})         │
│       │                                                                   │
│       ├──[:EMPLOYEE_OF]───▶(:Business)                                    │
│       │                                                                   │
│       ├──[:REFERRED_BY]───▶(:Contact)                                     │
│       │                                                                   │
│       └──[:INTERACTS_WITH]───▶(:Contact)                                  │
│                                   │                                        │
│                                   {strength: 85, lastAt: timestamp}        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  (:Business A)───[:SHARES_RIDERS_WITH]───▶(:Business B)                  │
│                      {riderCount: 12, strength: strong}                    │
│                                                                             │
│  (:Business)───[:SUPPLIER_OF]───▶(:Business)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Graph Edge Properties

| Relationship       | Properties                                            |
| ------------------ | ----------------------------------------------------- |
| MEMBER_OF          | since, role, isActive                                 |
| WORKER_IN          | since, jobCount, avgRating                            |
| SHARES_RIDERS_WITH | riderCount, lastSharedAt, strength                    |
| INTERACTS_WITH     | interactionCount, lastInteractionAt, strength (0-100) |
| REFERRED_BY        | referralCode, rewardClaimed, rewardAmount             |
| MATCHED_TO         | matchedAt, confidenceScore, matchType                 |

---

### D. Smart Suggestions Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SMART SUGGESTIONS ENGINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Suggestion Categories:                                                     │
│  ─────────────────────                                                     │
│                                                                             │
│  1. INVITATION_SUGGESTIONS                                                 │
│     "This rider works with 3 competitor businesses"                        │
│     "5 of your contacts are not on the platform"                          │
│     "These shops have worked with your riders previously"                   │
│                                                                             │
│  2. RELATIONSHIP_CLASSIFICATION                                            │
│     "Based on interaction patterns, classify as SUPPLIER"                  │
│     "This contact appears to be a frequent customer"                       │
│     "Recommend partner relationship with this business"                    │
│                                                                             │
│  3. CROSS_WORKSPACE_INSIGHTS                                               │
│     "You and Business X share 3 active riders"                             │
│     "Rider Y works in both your workspaces"                                │
│     "This customer has orders in 2 of your branches"                       │
│                                                                             │
│  4. REFERRAL_OPTIMIZATION                                                  │
│     "Contact A has high referral potential (10+ contacts)"                 │
│     "Best time to send referral reminder: Thursday 2PM"                    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Scoring Algorithm:                                                         │
│  ───────────────────                                                        │
│  suggestionScore = f(relationshipStrength, recency, affinity, capacity)    │
│                                                                             │
│  Where:                                                                     │
│  - relationshipStrength: Graph edge weight                                  │
│  - recency: Time since last interaction                                    │
│  - affinity: User engagement history                                      │
│  - capacity: Propensity to act on suggestion                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### E. Privacy & Isolation Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRIVACY & ISOLATION RULES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GOLDEN RULES:                                                              │
│  ────────────                                                              │
│                                                                             │
│  1. NO CROSS-WORKSPACE DATA LEAKAGE                                        │
│     - Contacts scoped to workspace are invisible to other workspaces        │
│     - Graph queries MUST include workspaceId filter                         │
│     - Analytics aggregation only on permitted workspaces                    │
│                                                                             │
│  2. CONSENT-DRIVEN VISIBILITY                                             │
│     - User must opt-in to appear in contact suggestions                     │
│     - Phone number sharing requires explicit consent                        │
│     - Privacy settings override all graph visibility                        │
│                                                                             │
│  3. INVITATION GATING                                                     │
│     - Suggest invitation ≠ Auto-invite                                      │
│     - Batch invitations require user confirmation                           │
│     - Opt-out after invitation sent                                        │
│                                                                             │
│  4. CONTROLLED AGGREGATION                                                │
│     - Cross-workspace stats only with explicit permission                  │
│     - Rider multi-workspace earnings require consent                       │
│     - Fleet analytics require workspace admin approval                      │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Technical Enforcement:                                                     │
│  ─────────────────────                                                      │
│                                                                             │
│  // Neo4j query guard                                                       │
│  function queryGraph(userId, workspaceId, query) {                         │
│    const accessibleWorkspaces = getAccessibleWorkspaces(userId);            │
│    if (!accessibleWorkspaces.includes(workspaceId)) {                      │
│      throw new PrivacyViolationError();                                    │
│    }                                                                       │
│    return executeQuery(query, { workspaceId });                             │
│  }                                                                         │
│                                                                             │
│  // Contact visibility scope                                               │
│  - Global contacts: visible everywhere (verified users)                     │
│  - Workspace contacts: visible only within workspace                       │
│  - Private contacts: visible only to owner                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### F. Growth Mechanics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROWTH MECHANICS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Referral Tracking:                                                          │
│  ─────────────────                                                          │
│  - Unique referral codes per user/workspace                                 │
│  - Attribution chain: referrer → invited → converted                        │
│  - Reward calculation: based on referrer tier + invitee value              │
│                                                                             │
│  Relationship Scoring:                                                      │
│  ────────────────────                                                        │
│  - interactionCount: Jobs, messages, calls                                  │
│  - recencyWeight: Exponential decay (λ = 0.1/week)                         │
│  - affinityScore: Based on job completion rate                             │
│  - networkCentrality: Eigenvector centrality in graph                       │
│                                                                             │
│  Network Expansion Analytics:                                               │
│  ───────────────────────────                                                │
│  - Growth rate by source (CSV, device, CRM)                                 │
│  - Conversion funnel: import → match → invite → onboard → active            │
│  - Viral coefficient: referrals per active user                             │
│  - Network density: connections per business                                │
│                                                                             │
│  Automated Onboarding Nudges:                                               │
│  ────────────────────────────                                                │
│  - Day 1: Welcome + set up profile                                        │
│  - Day 3: "Complete your workspace profile"                                │
│  - Day 7: "Invite your first contact"                                     │
│  - Day 14: "Your network is growing!"                                     │
│  - Day 30: Review engagement metrics                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 2: MULTI-FACETED REPORT GENERATION ENGINE

### 1. Role-Based Report Views

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROLE-TO-REPORT MATRIX                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Role           │ Reports Available                                         │
│  ───────────────┼───────────────────────────────────────────────────────   │
│  RIDER          │ • My Earnings (daily/weekly/monthly)                     │
│                 │ • My Jobs (history, ratings, tips)                      │
│                 │ • My Availability                                        │
│                 │ • Earnings by JobType                                    │
│                 │ • Performance vs Peers                                   │
│  ───────────────┼───────────────────────────────────────────────────────   │
│  BUSINESS       │ • Operational Dashboard                                   │
│                 │ • Job Completion Rate                                    │
│                 │ • Rider Utilization                                      │
│                 │ • Customer Satisfaction                                  │
│                 │ • Cost Analysis                                          │
│                 │ • Branch Performance                                     │
│  ───────────────┼───────────────────────────────────────────────────────   │
│  FLEET MANAGER  │ • Fleet Performance (all branches)                      │
│                 │ • Rider Productivity                                     │
│                 │ • Asset Utilization                                     │
│                 │ • SLA Compliance                                         │
│                 │ • Cost Optimization                                      │
│  ───────────────┼───────────────────────────────────────────────────────   │
│  MARKETPLACE    │ • Conversion Funnel                                      │
│                 │ • Supply/Demand Balance                                  │
│                 │ • Pricing Efficiency                                     │
│                 │ • User Acquisition                                      │
│                 │ • Revenue by Segment                                    │
│  ───────────────┼───────────────────────────────────────────────────────   │
│  PLATFORM ADMIN │ • Platform Health Metrics                                │
│                 │ • Workspace Analytics                                   │
│                 │ • Revenue Aggregation                                    │
│                 │ • User Growth                                           │
│                 │ • System Performance                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Faceted Filtering System

```typescript
interface ReportFilter {
  // Required filters (always available)
  workspaceId: UUID[]; // Multi-select
  dateRange: DateRange; // Presets + custom

  // JobType filtering
  jobTypeId: UUID[]; // Based on enabled JobTypes

  // Worker filtering
  workerId: UUID[];
  workerType: WorkerType[]; // RIDER, MOVER, DRIVER

  // Organizational filtering
  branchId: UUID[];

  // Asset filtering
  assetId: UUID[];
  assetType: AssetType[];

  // Customer filtering
  customerSegment: Segment[]; // NEW, REGULAR, VIP
  customerId: UUID[];

  // Performance filtering
  slaStatus: SLAStatus[]; // MET, BREACHED, AT_RISK

  // Revenue filtering
  revenueRange: Range;
  jobTypeRevenue: boolean;

  // Referral filtering
  referralSourceId: UUID[];

  // Aggregation scope
  groupBy: GroupByDimension[];
  aggregateBy: AggregateFunction[];
}
```

---

### 3. Multi-Dimensional Aggregations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AGGREGATION QUERY EXAMPLES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Revenue by JobType by Workspace                                         │
│     ─────────────────────────────────────                                   │
│     SELECT                                                                  │
│       workspace.name,                                                       │
│       job_type.name,                                                        │
│       SUM(earnings.netEarnings) as totalRevenue,                           │
│       COUNT(*) as jobCount,                                                 │
│       AVG(earnings.netEarnings) as avgJobValue                            │
│     FROM earnings                                                            │
│     JOIN workspace ON earnings.workspaceId = workspace.id                   │
│     JOIN job ON earnings.jobId = job.id                                     │
│     JOIN job_type ON job.jobTypeId = job_type.id                           │
│     WHERE earnings.workspaceId IN (:workspaces)                            │
│       AND earnings.periodDate BETWEEN :start AND :end                      │
│     GROUP BY workspace.id, job_type.id                                      │
│     ORDER BY totalRevenue DESC                                              │
│                                                                             │
│  2. Rider Utilization by Branch                                             │
│     ─────────────────────────────────────                                   │
│     SELECT                                                                  │
│       branch.name,                                                          │
│       rider.id,                                                             │
│       COUNT(*) as totalJobs,                                                │
│       SUM(job.actualDuration) /  SUM(job.estimatedDuration) as utilPct,   │
│       AVG(job.rating) as avgRating                                         │
│     FROM assignment                                                          │
│     JOIN rider ON assignment.riderId = rider.id                            │
│     JOIN job ON assignment.jobId = job.id                                   │
│     JOIN branch ON job.branchId = branch.id                                │
│     WHERE assignment.status = 'COMPLETED'                                  │
│       AND branch.workspaceId IN (:workspaces)                              │
│     GROUP BY branch.id, rider.id                                            │
│     HAVING utilPct > 0.7                                                   │
│     ORDER BY totalJobs DESC                                                 │
│                                                                             │
│  3. Referral Conversion by Source                                           │
│     ─────────────────────────────────────                                   │
│     SELECT                                                                  │
│       referralSource.displayName as source,                                 │
│       COUNT(DISTINCT referralTarget.id) as totalInvited,                  │
│       COUNT(DISTINCT CASE WHEN user.isActive THEN user.id END) as conv,   │
│       SUM(earnings.netEarnings) as attributedRevenue                       │
│     FROM contact AS referralSource                                          │
│     JOIN contact AS referralTarget ON referralTarget.referredBy =          │
│       referralSource.id                                                     │
│     LEFT JOIN membership ON membership.userId = referralTarget.matchedUserId│
│     LEFT JOIN earnings ON earnings.riderId = membership.userId             │
│     WHERE referralSource.workspaceId IN (:workspaces)                      │
│       AND referralSource.contactType = 'REFERRAL'                          │
│     GROUP BY referralSource.id                                             │
│     ORDER BY attributedRevenue DESC                                         │
│                                                                             │
│  4. Multi-Workspace Earnings Rollup (Rider)                                 │
│     ─────────────────────────────────────                                   │
│     SELECT                                                                  │
│       rider.id,                                                            │
│       JSON_AGG(JSON_BUILD_OBJECT(                                          │
│         'workspace', workspace.name,                                       │
│         'earnings', SUM(earnings.netEarnings),                            │
│         'jobs', COUNT(*)                                                   │
│       )) as earningsByWorkspace,                                            │
│       SUM(earnings.netEarnings) as totalEarnings                          │
│     FROM earnings                                                           │
│     JOIN workspace ON earnings.workspaceId = workspace.id                   │
│     JOIN rider ON earnings.riderId = rider.id                              │
│     WHERE earnings.riderId = :riderId                                      │
│       AND earnings.periodDate BETWEEN :start AND :end                      │
│     GROUP BY rider.id                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Report Template System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REPORT TEMPLATE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Template Types:                                                            │
│  ───────────────                                                            │
│                                                                             │
│  PRE-BUILT (Core):                                                          │
│  ────────────────                                                           │
│  - Daily Operations Summary                                                 │
│  - Weekly Earnings Report                                                   │
│  - Monthly Business Review                                                  │
│  - Quarterly Performance Analysis                                           │
│  - Annual Strategic Report                                                  │
│  - Rider Payout Report                                                      │
│  - Job Cost Analysis                                                       │
│  - SLA Performance Report                                                  │
│  - Customer Satisfaction Report                                            │
│                                                                             │
│  CUSTOM BUILDER:                                                            │
│  ─────────────                                                              │
│  - Drag-and-drop metric selection                                           │
│  - Custom grouping dimensions                                               │
│  - Formula editor for calculated metrics                                    │
│  - Conditional formatting rules                                             │
│  - Custom chart configurations                                              │
│                                                                             │
│  SAVED CONFIGURATIONS:                                                      │
│  ───────────────────                                                        │
│  - User-specific saved views                                               │
│  - Workspace-shared templates                                               │
│  - Role-based default views                                                 │
│                                                                             │
│  SCHEDULED GENERATION:                                                      │
│  ──────────────────────                                                     │
│  - Cron-based scheduling                                                   │
│  - Email delivery                                                          │
│  - Slack/Discord webhook                                                   │
│  - Cloud storage upload (S3)                                               │
│                                                                             │
│  REPORT TYPES:                                                              │
│  ─────────────                                                              │
│  - SNAPSHOT: Point-in-time data freeze                                     │
│  - LIVE: Real-time query results                                            │
│  - DELTA: Changes since last report                                         │
│                                                                             │
│  EXPORT FORMATS:                                                            │
│  ───────────────                                                            │
│  - PDF (formatted, paginated)                                               │
│  - CSV (raw data)                                                           │
│  - Excel (with formatting)                                                  │
│  - Dashboard embed (JSON API)                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Scope Levels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPORT SCOPE LEVELS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PERSONAL          → Single user's own data                                │
│                     Example: "My earnings this month"                     │
│                     ─────────────────────────────                          │
│                                                                             │
│  WORKSPACE         → All data within one workspace                        │
│                     Example: "All jobs in Logistics workspace"            │
│                     ─────────────────────────────────                     │
│                                                                             │
│  BRANCH            → Data within workspace branches                        │
│                     Example: "Eastland branch performance"                │
│                     ──────────────────────────────                        │
│                                                                             │
│  CROSS-WORKSPACE   → Multiple workspaces (requires permission)            │
│                     Example: "All SACCO branches aggregated"             │
│                     ─────────────────────────────────                     │
│                     Requires: CROSS_WORKSPACE_REPORT permission            │
│                                                                             │
│  PLATFORM-WIDE     → Entire platform (admin only)                         │
│                     Example: "Platform health metrics"                    │
│                     ─────────────────────────────                          │
│                     Requires: PLATFORM_ADMIN role                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6. Data Model Requirements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REPORTING DATA STRATEGY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EVENT SOURCING (Immutable Ledger):                                        │
│  ───────────────────────────────────                                       │
│  - All financial transactions (earnings, payments)                        │
│  - Job state changes                                                        │
│  - Assignment lifecycle                                                     │
│  - Membership changes                                                       │
│  - Contact import events                                                   │
│                                                                             │
│  AGGREGATION TABLES (Pre-computed):                                        │
│  ──────────────────────────────                                              │
│  - daily_earnings_summary (by rider, workspace, jobType)                  │
│  - daily_job_metrics (by workspace, branch, jobType)                      │
│  - weekly_worker_utilization (by rider, workspace)                        │
│  - monthly_revenue_rollup (by workspace, segment)                          │
│  - hourly_sla_performance (by workspace, jobType)                         │
│                                                                             │
│  MATERIALIZED VIEWS (Refreshed on schedule):                               │
│  ─────────────────────────────────────────                                 │
│  - workspace_health_snapshot (hourly)                                      │
│  - rider_performance_metrics (daily)                                       │
│  - business_operational_summary (daily)                                    │
│  - cross_workspace_earnings (weekly - if permitted)                       │
│                                                                             │
│  QUERY PERFORMANCE STRATEGY:                                                │
│  ──────────────────────────                                                 │
│  - < 1 second: Pre-aggregated views                                        │
│  - 1-5 seconds: Aggregated tables                                          │
│  - > 5 seconds: Async report generation                                    │
│  - Large exports: Background job + notification                            │
│                                                                             │
│  PARTITIONING:                                                              │
│  ────────────                                                               │
│  - By workspaceId (primary)                                                 │
│  - By periodDate (secondary)                                               │
│  - By jobTypeId (for JobType-specific reports)                            │
│                                                                             │
│  INDEXING:                                                                  │
│  ─────────                                                                  │
│  - Composite indexes for common query patterns                             │
│  - Partial indexes for status-filtered queries                             │
│  - GIN indexes for JSONB columns                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 7. UI Derivation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DASHBOARD UI ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     DASHBOARD BLOCKS                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  KPI CARDS              TREND CHARTS           COMPARATIVE          │   │
│  │  ───────────            ───────────           ──────────           │   │
│  │  • Total Revenue        • Line chart          • Bar comparison     │   │
│  │  • Jobs Completed       • Area chart          • Donut breakdown   │   │
│  │  • Active Riders        • Sparklines          • Progress rings    │   │
│  │  • Avg Rating           • Heatmap             • Comparison table   │   │
│  │                                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  DATA TABLES                                                       │   │
│  │  ───────────                                                       │   │
│  │  • Sortable columns                                                │   │
│  │  • Expandable rows (drill-down)                                   │   │
│  │  • Inline filtering                                                │   │
│  │  • Column customization                                            │   │
│  │  • Export buttons                                                  │   │
│  │                                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  DRILL-DOWN PATHS                                                  │   │
│  │  ────────────────                                                  │   │
│  │  Dashboard → Workspace → Branch → Worker → Job Detail             │   │
│  │  Earnings → By JobType → By Worker → Individual Jobs             │   │
│  │  SLA → Breached → Job → Assignment → Rider → Profile            │   │
│  │                                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  OUTLIER DETECTION                                                 │   │
│  │  ────────────────                                                  │   │
│  │  • Highlight statistically significant deviations                  │   │
│  │  • Color-coded badges (above/below expected)                      │   │
│  │  • Anomaly alerts in sidebar                                       │   │
│  │  • Click to investigate outlier                                    │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  INTERACTIVE FEATURES:                                                      │
│  ─────────────────────                                                      │
│  • Date range selector with presets                                        │
│  • Workspace/Branch filter dropdowns                                       │
│  • Toggle between chart types                                              │
│  • Zoom on time-series charts                                              │
│  • Save as default view                                                    │
│  • Share report link                                                      │
│  • Schedule report delivery                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 3: SYSTEM INTEGRATION

### How Contact Graph Enhances Reporting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               CONTACT GRAPH → REPORTING INTEGRATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REFERRAL ANALYTICS                                                    │
│     ───────────────────                                                    │
│     • Track referral source → converted user → active rider                 │
│     • Calculate referral LTV (Lifetime Value)                              │
│     • Attribution reporting by referral source                             │
│     • Network effect metrics (referrals generating referrals)               │
│                                                                             │
│  2. RELATIONSHIP-BASED INSIGHTS                                           │
│     ─────────────────────────                                              │
│     • Business-to-business rider sharing reports                          │
│     • Partner collaboration metrics                                        │
│     • Supplier relationship strength over time                             │
│                                                                             │
│  3. CUSTOMER SEGMENTATION                                                 │
│     ─────────────────────                                                  │
│     • Contact relationship strength → customer value                       │
│     • Predict customer lifetime based on graph position                    │
│     • Identify high-potential customer contacts                            │
│                                                                             │
│  4. WORKFORCE ANALYTICS                                                   │
│     ───────────────────                                                    │
│     • Rider connection network analysis                                    │
│     • Team/crew composition from contact graph                            │
│     • Cross-workspace rider collaboration metrics                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How JobType Affects Report Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     JOBTYPE REPORT IMPACT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  JobType-specific Metrics:                                                  │
│  ─────────────────────────                                                 │
│                                                                             │
│  DELIVERY          │ MOVERS          │ WHOLESALE      │ FLEET             │
│  ────────────────  │ ─────────────── │ ────────────── │ ───────────────   │
│  • Distance        │ • Volume        │ • Quantity     │ • Utilization     │
│  • Delivery time   │ • Items count   │ • Order value │ • Asset hours    │
│  • Package type    │ • Truck size    │ • SKU count   │ • Driver hours    │
│  • Route efficiency│ • Labor time    │ • Frequency   │ • Maintenance     │
│                                                                             │
│  JobType-specific KPIs:                                                    │
│  ───────────────────────                                                    │
│  • DELIVERY: On-time %, First-attempt success, Package condition          │
│  • MOVERS: Damage rate, Time vs estimate, Repeat booking rate              │
│  • WHOLESALE: Order fill rate, Stock rotation, Delivery consistency      │
│  • FLEET: Asset uptime, Cost per mile, Safety score                       │
│                                                                             │
│  Report Implication:                                                       │
│  ───────────────────                                                        │
│  → JobType dimension adds unique metrics to every report                  │
│  → Cross-JobType comparison requires normalization                        │
│  → JobType-specific dashboards with tailored KPIs                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Assignment Strategy → Performance Dashboards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              ASSIGNMENT STRATEGY → DASHBOARD INTEGRATION                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Strategy Types Impact on Reports:                                          │
│  ─────────────────────────────────                                          │
│                                                                             │
│  SINGLE_WORKER    → Individual rider performance                          │
│                   → Assignment-to-completion time                           │
│                                                                             │
│  MULTI_WORKER     → Team composition metrics                               │
│                   → Collaboration effectiveness                            │
│                   → Work distribution equity                                │
│                                                                             │
│  GEO_NEAREST     → Route efficiency metrics                                │
│                   → Zone coverage analysis                                 │
│                   → Response time by location                              │
│                                                                             │
│  MARKETPLACE_BID  → Bid analysis                                           │
│                   → Cost optimization potential                            │
│                   → Winner selection fairness                               │
│                                                                             │
│  ROUND_ROBIN     → Load balancing metrics                                  │
│                   → Equity across workers                                  │
│                   → Capacity utilization                                   │
│                                                                             │
│  FLEET_MATCHING  → Fleet utilization                                      │
│                   → Asset-job fit score                                    │
│                   → Multi-assignment coordination                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 4: STRESS TEST ANALYSIS

### Scenario Parameters

| Parameter         | Value           |
| ----------------- | --------------- |
| Rider workspaces  | 5               |
| Contact import    | 5,000           |
| Branch oversight  | 3 branches      |
| Platform jobs     | 100,000         |
| Report generation | Daily, at scale |

---

### Performance Bottlenecks & Mitigations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PERFORMANCE ANALYSIS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. QUERY COMPLEXITY EXPLOSION                                             │
│     ──────────────────────────                                             │
│     Problem: 5 workspaces × multiple JobTypes × daily reports             │
│     → Exponential query time                                               │
│                                                                             │
│     Mitigation:                                                            │
│     • Pre-aggregate at ingest time                                         │
│     • Materialized views refreshed hourly                                   │
│     • Report caching (24-hour TTL)                                         │
│     • Async generation for complex reports                                 │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  2. GRAPH QUERY PERFORMANCE                                                │
│     ───────────────────────                                                │
│     Problem: 5,000 contacts → graph traversal → Neo4j overload           │
│                                                                             │
│     Mitigation:                                                            │
│     • Denormalized relationship counts in Postgres                         │
│     • Neo4j for complex queries only                                       │
│     • Graph pruning for suggestions (top-K)                               │
│     • Batch processing for bulk operations                                │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  3. MULTI-WORKSPACE AGGREGATION                                            │
│     ────────────────────────────                                            │
│     Problem: Rider in 5 workspaces → earnings rollup queries             │
│                                                                             │
│     Mitigation:                                                            │
│     • Cross-workspace index                                                │
│     • Permission-cached user workspaces                                     │
│     • Async aggregation with status polling                                 │
│     • Pre-computed daily rollups                                           │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  4. REPORT EXPORT AT SCALE                                                 │
│     ─────────────────────────                                              │
│     Problem: 100K jobs → PDF/CSV export → timeout                        │
│                                                                             │
│     Mitigation:                                                            │
│     • Background job with progress tracking                                │
│     • Chunked generation (pagination)                                       │
│     • Pre-computed summary tables                                           │
│     • S3 presigned URL for download                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Integrity Risks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA INTEGRITY RISKS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Risk: Cross-workspace earnings miscalculation                            │
│  ─────────────────────────────────────────────                             │
│  • Rider works in 5 workspaces                                             │
│  • Earnings attribution must be exact                                      │
│  • Solution: Immutable ledger + reconciliation job                         │
│                                                                             │
│  Risk: Contact merge conflicts                                             │
│  ─────────────────────────────                                             │
│  • Multiple sources → same person → duplicate contacts                     │
│  • Solution: Merge audit log + reversible merges                           │
│                                                                             │
│  Risk: Report data freshness                                               │
│  ────────────────────────────                                              │
│  • Stale aggregations → incorrect decisions                               │
│  • Solution: Clear data freshness indicators in UI                         │
│                                                                             │
│  Risk: Privacy boundary breach                                              │
│  ────────────────────────────                                              │
│  • Cross-workspace query injection                                        │
│  • Solution: Workspace scope enforced at query layer                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Privacy Risks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRIVACY RISKS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Risk: Contact data leakage                                                │
│  ───────────────────────────                                               │
│  • Business imports competitor contacts → competitive intel               │
│  • Solution: Contact ownership + access logging                            │
│                                                                             │
│  Risk: Multi-workspace membership exposure                                  │
│  ────────────────────────────────────────────                             │
│  • Rider's other workspace earnings visible to current workspace            │
│  • Solution: Strict permission model + opt-in consent                       │
│                                                                             │
│  Risk: Graph-based inference                                                │
│  ────────────────────────────                                              │
│  • Indirect relationships reveal hidden connections                         │
│  • Solution: Privacy-preserving aggregation + noise injection              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 5: WHAT NOT TO BUILD

### Overengineering Traps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OVERENGINEERING TRAPS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. GRAPH COMPLEXITY PREMATURE OPTIMIZATION                               │
│     Problem: Building full Neo4j knowledge graph before validation          │
│     Why: Contact relationships are simple (pairs) initially                 │
│     Instead: Start with Postgres relationships, promote to Neo4j on need    │
│                                                                             │
│  2. REPORT BUILDER OVER-FLEXIBILITY                                      │
│     Problem: Allow users to build ANY report                                │
│     Why: 90% use 10% of features; complexity harms usability                │
│     Instead: Pre-built templates + limited customization                   │
│                                                                             │
│  3. REAL-TIME EVERYTHING                                                   │
│     Problem: All reports real-time                                         │
│     Why: Most analytics don't need sub-second latency                       │
│     Instead: Async for complex, real-time for KPIs only                     │
│                                                                             │
│  4. UNIVERSAL SEARCH                                                       │
│     Problem: Single search across all entities                              │
│     Why: Performance + relevance trade-off impossible                       │
│     Instead: Entity-specific search with cross-entity drill-down           │
│                                                                             │
│  5. CUSTOM CALCULATED FIELDS                                               │
│     Problem: Users define custom formulas                                  │
│     Why: Security risks + maintenance burden                                │
│     Instead: Pre-defined metrics with limited overrides                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When to Constrain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONSTRAINT RECOMMENDATIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Constrain This            │ Instead Do This                              │
│  ────────────────          │ ────────────────                             │
│  ───────────────────────────────────────────────────────────────────────   │
│  Custom report dimensions   │ Pre-built dimensions + request new        │
│                             │ feature for common needs                     │
│                                                                             │
│  Real-time graph updates    │ Hourly/daily sync + suggestion batch jobs  │
│                                                                             │
│  Unlimited contact imports  │ Tiered limits + batch processing            │
│                                                                             │
│  Cross-workspace default   │ Opt-in only + audit trail                  │
│                                                                             │
│  User-defined metrics      │ Platform metrics + admin config              │
│                                                                             │
│  Unlimited report history  │ 90-day retention + archive option          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## INCREMENTAL ROLLOUT PLAN

### Phase 1: Foundation (Weeks 1-4)

- [ ] Contact entity and basic import (CSV only)
- [ ] Simple deduplication (exact match)
- [ ] Basic reports (pre-built, single workspace)
- [ ] Analytics tables in Postgres

### Phase 2: Graph Basics (Weeks 5-8)

- [ ] Neo4j integration for relationship graph
- [ ] Multi-source import (device, CRM)
- [ ] Smart suggestions engine (invitation only)
- [ ] Cross-workspace reports (opt-in)

### Phase 3: Intelligence (Weeks 9-12)

- [ ] Fuzzy matching for deduplication
- [ ] Relationship inference
- [ ] Custom report builder (limited)
- [ ] Scheduled report delivery

### Phase 4: Scale (Weeks 13-16)

- [ ] Performance optimization (materialized views)
- [ ] Advanced filtering
- [ ] API for external integrations
- [ ] Multi-workspace rollup analytics

---

## ENTITY RELATIONSHIP MAP (TEXTUAL)

```
User ──────────────▶ Workspace
 │                        │
 │◀───────────────────────│
 │   MEMBER_OF           │
 │                        │
 ├────────────────────────┤
 │                        │
 ▼                        ▼
Contact ◀──────────▶ Contact
   │                  │
   │ REFERRED_BY      │ INTERACTS_WITH
   │                  │
   ▼                  ▼
Contact ───────────▶ Business
```

---

## DATA FLOW DIAGRAM (TEXTUAL)

```
Contact Import:
Raw Source → Parser → Normalizer → Deduplicator → Graph Builder → Contact Store
                                           ↓
                                     Suggestions

Report Generation:
User Request → Filter Parser → Query Builder → [Cache/Async Job]
     ↓                                              ↓
  Cache Hit ──────────────────────────────────▶ Aggregator → Materialized Views → Response
```

---

This architecture provides:

- **Contact Graph**: Automatic relationship inference with strict privacy controls
- **Reporting Engine**: Role-based, multi-facet analytics with scalable pre-computation
- **Integration**: Graph insights enhance reports, reports track growth metrics
- **Stress Readiness**: Pre-aggregation, async processing, and permission-based access
