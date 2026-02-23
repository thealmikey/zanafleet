# ZanaFleet Metrics & Observability Audit

**Date:** 2026-02-23  
**Scope:** NestJS API Monorepo (`apps/api/`)  
**Status:** 🔴 CRITICAL - No observability infrastructure

---

## Executive Summary

The ZanaFleet project **lacks any metrics and observability infrastructure**. While there are business-level dashboard metrics endpoints, there is no Prometheus integration, no OpenTelemetry tracing, no HTTP request metrics, and no structured observability for the event bus or job queues. This is a **critical gap** for production monitoring and debugging.

---

## Audit Results

### 1. Prometheus / OpenTelemetry Integrations

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Prometheus client | ❌ Missing | N/A | Not in `package.json` |
| OpenTelemetry | ❌ Missing | N/A | No tracing or metrics |
| `/metrics` endpoint | ❌ Missing | N/A | Only dashboard business metrics exist |
| Custom metrics middleware | ❌ Missing | N/A | None found |

**Locations Checked:**
- `package.json` - No prom-client, prometheus, @opentelemetry
- `apps/api/src/main.ts` - No metrics endpoints
- `apps/api/src/core/health/` - Health checks only

---

### 2. Health Checks

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Liveness probe | ✅ Implemented | [`apps/api/src/core/health/health.controller.ts:33`](apps/api/src/core/health/health.controller.ts#L33) | `/api/v1/health/live` |
| Readiness probe | ✅ Implemented | [`apps/api/src/core/health/health.controller.ts:47`](apps/api/src/core/health/health.controller.ts#L47) | `/api/v1/health/ready` |
| PostgreSQL check | ✅ Implemented | [`apps/api/src/core/health/health.controller.ts:54-67`](apps/api/src/core/health/health.controller.ts#L54) | Via DataSource query |
| Neo4j check | ✅ Implemented | `apps/api/src/core/health/neo4j.health-indicator.ts` | |
| NATS check | ✅ Implemented | `apps/api/src/core/health/nats.health-indicator.ts` | |
| Redis check | ✅ Implemented | `apps/api/src/core/health/redis.health-indicator.ts` | |

---

### 3. HTTP Request Metrics

| Metric | Status | Location | Notes |
|--------|--------|----------|-------|
| Request counts | ❌ Missing | N/A | No interceptor |
| Request durations | ❌ Missing | N/A | No timing |
| Status codes | ❌ Missing | N/A | No response code tracking |
| Per-workspaceId scoping | ❌ Missing | N/A | No multi-tenant metrics |
| Request/Response logging | ⚠️ Partial | Various | Only class-level loggers |

**Gap Analysis:**
- No global HTTP interceptor in `apps/api/src/main.ts`
- No `APP_INTERCEPTOR` providers
- `apps/api/src/app.module.ts` has no interceptors
- Logger exists per-class but no structured request tracking

---

### 4. Event Bus (NATS) Message Metrics

| Metric | Status | Location | Notes |
|--------|--------|----------|-------|
| Publish counts | ⚠️ Partial | [`apps/api/src/core/event-bus/event-bus.service.ts:29-30`](apps/api/src/core/event-bus/event-bus.service.ts#L29) | Only failure counts |
| Publish failures | ⚠️ Partial | [`apps/api/src/core/event-bus/event-bus.service.ts:187-197`](apps/api/src/core/event-bus/event-bus.service.ts#L187) | `getPublishFailureCount()`, `getPublishFailuresBySubject()` |
| Event logging | ⚠️ Partial | `apps/api/src/core/event-bus/services/event-logger.service.ts` | Logs but no metrics |
| Consumer metrics | ❌ Missing | N/A | No consumption tracking |
| Processing duration | ❌ Missing | N/A | No timing |
| Retry counts | ⚠️ Partial | [`apps/api/src/core/event-bus/services/event-logger.service.ts:88-90`](apps/api/src/core/event-bus/services/event-logger.service.ts#L88) | Logs only |
| Per-event-type breakdown | ❌ Missing | N/A | No structured counters |

---

### 5. Background Job Queue (BullMQ)

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Queue interface | ⚠️ Partial | [`apps/api/src/modules/agents/queue/job-queue.interface.ts`](apps/api/src/modules/agents/queue/job-queue.interface.ts) | Stub implementation |
| BullMQ implementation | ⚠️ Partial | [`apps/api/src/modules/agents/queue/job-queue.interface.ts:84-120`](apps/api/src/modules/agents/queue/job-queue.interface.ts#L84) | Empty methods |
| Job status tracking | ⚠️ Partial | [`apps/api/src/modules/agents/queue/job-queue.interface.ts:63-66`](apps/api/src/modules/agents/queue/job-queue.interface.ts#L63) | Returns null |
| Metrics | ❌ Missing | N/A | No counters for job states |
| Retry metrics | ❌ Missing | N/A | No tracking |
| Dead-letter metrics | ❌ Missing | N/A | No tracking |

**Note:** BullMQ is not in `package.json` dependencies - the queue is stubbed but not implemented.

---

### 6. Multi-Tenant Scoping

| Area | Status | Notes |
|------|--------|-------|
| WorkspaceId header | ⚠️ Partial | Defined in Swagger but not enforced for metrics |
| Per-workspace HTTP metrics | ❌ Missing | No request-level tenant scoping |
| Per-workspace event metrics | ❌ Missing | Events have aggregateId but no workspaceId |
| Tenant isolation | ⚠️ Partial | Database-level tenant scoping exists |

---

## Coverage Matrix

```
+----------------------------------+----------+------------+-------------+
| Category                         | Status   | Severity   | Effort      |
+----------------------------------+----------+------------+-------------+
| Prometheus /metrics endpoint     | ❌       | CRITICAL   | Medium      |
| OpenTelemetry tracing            | ❌       | CRITICAL   | High        |
| Health checks                    | ✅       | N/A        | Done        |
| HTTP request counts              | ❌       | HIGH       | Low         |
| HTTP request durations           | ❌       | HIGH       | Low         |
| HTTP status codes                | ❌       | HIGH       | Low         |
| Per-workspaceId metrics           | ❌       | HIGH       | Medium      |
| NATS publish counts              | ⚠️       | MEDIUM     | Low         |
| NATS publish failures            | ⚠️       | MEDIUM     | Done        |
| NATS consumer metrics            | ❌       | HIGH       | Medium      |
| NATS processing duration        | ❌       | MEDIUM     | Medium      |
| BullMQ job metrics               | ❌       | HIGH       | High        |
| Event retry metrics             | ⚠️       | MEDIUM     | Low         |
+----------------------------------+----------+------------+-------------+
```

---

## Recommendations

### Phase 1: Essential Metrics (Low Effort)

1. **Add Prometheus Metrics Module**
   - Add `prom-client` to dependencies
   - Create `/api/v1/metrics` endpoint exposing Prometheus format

2. **HTTP Request Interceptor**
   - Create `MetricsInterceptor` in `apps/api/src/core/metrics/`
   - Track: request count, duration, status code by route
   - Extract `workspaceId` from headers for multi-tenant scoping

3. **Enhance EventBusService**
   - Add counters for: `events_published_total`, `events_failed_total`
   - Add histogram for publish duration
   - Expose via `/metrics`

### Phase 2: Event & Job Observability (Medium Effort)

4. **Event Bus Metrics**
   - Add counters for: `events_consumed_total`, `events_processed_total`, `events_retried_total`
   - Add histogram for event processing duration
   - Track by event type

5. **Job Queue Metrics**
   - Implement actual BullMQ integration
   - Track: `jobs_queued`, `jobs_completed`, `jobs_failed`, `jobs_in_progress`
   - Track queue depth

### Phase 3: Distributed Tracing (High Effort)

6. **OpenTelemetry Integration**
   - Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
   - Add trace context propagation to NATS events
   - Add trace context to HTTP requests

---

## Required Dependencies

```json
{
  "dependencies": {
    "prom-client": "^15.1.0"
  },
  "optional": {
    "@opentelemetry/sdk-node": "^0.46.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-prometheus": "^0.46.0"
  }
}
```

---

## Conclusion

The ZanaFleet API has **zero observability infrastructure** for metrics. This is a critical gap for production systems. The minimal recommendation is to:

1. Add `prom-client` dependency
2. Create HTTP metrics interceptor with workspaceId tagging
3. Expose `/api/v1/metrics` endpoint
4. Add counters to EventBusService

This can be accomplished in **1-2 days** of development work and provides immediate visibility into system health.