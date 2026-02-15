# SDUI Runtime Test Coverage Matrix

## Overview

This matrix maps SDUI features to test types, ensuring comprehensive coverage across all layers.

## Feature → Test Layer Mapping

| Feature | Unit | Integration | E2E | Perf | Security | Contract |
|---------|:----:|:-----------:|:---:|:----:|:--------:|:--------:|
| **UISchema Validation** | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| **Component Registry** | ✓ | ✓ | - | ✓ | ✓ | - |
| **Layout Resolution** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Capability Filtering** | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| **AI Suggestion Attachment** | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| **Consent Enforcement** | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| **Action Routing** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **State Reconciliation** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Data Binding** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Version Negotiation** | ✓ | ✓ | - | - | ✓ | ✓ |
| **Telemetry Emission** | ✓ | ✓ | - | ✓ | ✓ | - |
| **Schema Backward Compatibility** | - | - | ✓ | - | - | ✓ |
| **Partial Region Refresh** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Risk Overlay Injection** | ✓ | - | ✓ | - | ✓ | - |
| **Form Validation** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Screen Composition** | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| **Multi-Platform Rendering** | ✓ | - | ✓ | - | - | ✓ |
| **Chat-First Screens** | ✓ | ✓ | ✓ | - | - | - |
| **Dashboard Screens** | ✓ | ✓ | ✓ | ✓ | - | - |
| **Notification Center** | ✓ | ✓ | ✓ | - | - | - |
| **Real-Time Updates** | - | ✓ | ✓ | ✓ | - | - |
| **Workflow Integration** | - | ✓ | ✓ | - | ✓ | - |

## Critical Coverage Requirements

### P0 - Must Have

| Test Type | Coverage Target | Critical Tests |
|-----------|----------------|----------------|
| Unit | 90% | All core services, validators, compilers |
| Integration | 100% | Full pipeline, workflow integration |
| E2E | 100% | All user journeys |
| Security | 100% | All threat vectors |

### P1 - Should Have

| Test Type | Coverage Target | Critical Tests |
|-----------|----------------|----------------|
| Performance | 90% | Latency, throughput, memory |
| Contract | 100% | Schema compatibility |

### P2 - Nice to Have

| Test Type | Coverage Target | Critical Tests |
|-----------|----------------|----------------|
| Property-Based | 80% | Invariant validation |
| Fuzz | 60% | Malformed input handling |
| Chaos | 40% | Resilience scenarios |

## Test Execution Strategy

### Daily Runs
- Unit tests (all modules)
- Integration tests (critical paths)
- Contract tests

### Per-PR Runs
- All unit tests
- All integration tests  
- E2E (critical journeys only)
- Security tests

### Weekly Runs
- Full E2E suite
- Performance benchmarks
- Property-based tests
- Fuzz tests

### Release Runs
- Full test suite
- Chaos engineering
- Mutation testing

## Coverage by Component

### Compiler Service
- [x] UISchema compilation
- [x] Condition evaluation
- [x] Endpoint variable resolution
- [x] Response building
- [x] ETag generation
- [ ] Partial region compilation (TODO)

### Composer Service
- [x] Screen composition
- [x] Action execution
- [x] Binding resolution
- [x] Telemetry emission
- [ ] Region refresh (TODO)

### Component Registry
- [x] Component registration
- [x] Component retrieval
- [x] Category filtering
- [x] Tag filtering
- [x] Platform support checks
- [ ] Dynamic component loading (TODO)

### Validation Service
- [x] Required field validation
- [x] Type validation (email, url, phone)
- [x] Range validation (min, max)
- [x] Pattern validation
- [x] Custom validators
- [ ] Async validators (TODO)

### Telemetry Service
- [x] Screen rendered events
- [x] Action events
- [x] Error events
- [ ] Performance events (TODO)

## Security Coverage

| Threat Vector | Unit | Integration | E2E |
|--------------|:----:|:-----------:|:---:|
| Capability Bypass | ✓ | ✓ | ✓ |
| Consent Bypass | ✓ | ✓ | ✓ |
| Schema Poisoning | ✓ | - | ✓ |
| AI Injection | ✓ | - | ✓ |
| Action Forgery | ✓ | - | ✓ |
| XSS in Bindings | - | - | ✓ |
| Replay Attacks | ✓ | - | - |
| Cross-Context Access | - | ✓ | ✓ |

## Performance Coverage

| Metric | Target | Tests |
|--------|--------|-------|
| Simple Screen Latency | < 100ms | ✓ |
| Complex Dashboard | < 500ms | ✓ |
| Action Execution | < 50ms | ✓ |
| Concurrent Requests | 100/sec | ✓ |
| Memory Growth | < 50MB/100 calls | ✓ |

## Maintenance

- Review coverage matrix quarterly
- Add new test types as needed
- Update targets based on production metrics
- Document coverage gaps in technical debt

---

*Last Updated: 2026-02-14*
*Document Owner: Platform Team*
