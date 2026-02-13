# Move Intelligence Layer Architecture

This document defines the IntelligenceContext and MoveIntelligenceEngine components for the ZanaFleet Movers module intelligence layer.

## 1. IntelligenceContext

### Description

IntelligenceContext is a snapshot object that wraps all inputs required for agentic reasoning about moving jobs. It serves as the single source of truth for the MoveIntelligenceEngine, aggregating MoveProfile data, available vehicles, demand signals, and contextual metadata. The context is designed to be built from existing services without modifying Order entities or orchestrators, preserving backward compatibility while enabling intelligent decision-making.

The context object is immutable once constructed and can be serialized for logging, debugging, or replay scenarios. Each instance captures the state of the system at decision time, supporting traceability and audit requirements.

### Interface Specification

**IntelligenceContext**

- **moveProfile**: A MoveProfile object containing estimated volume in cubic meters, labor requirement count, fragility factor enumeration, optional array of special items requiring extraordinary handling, optional floor count, and legacy house size enumeration as fallback. This is the primary input for all reasoning operations.

- **availableVehicles**: An array of VehicleCapabilityProfile objects representing vehicles available for matching. Each profile includes maximum volume capacity, allowed load types, crew capacity, supported move types, special features such as liftgate or climate control, and vehicle identifiers. This data is sourced from the VehicleMatchingService which wraps the VEHICLE_CAPABILITY_DEFAULTS constant.

- **demandSignals**: An optional object containing temporal and contextual demand indicators. Fields include demandMultiplier as a decimal representing current demand surge level, dayOfWeek as an integer where zero represents Sunday, month as an integer where zero represents January, holidayProximity as a number indicating days until nearest holiday, and seasonClassification as local, regional, or long-distance. These signals are computed from the requested date and calendar heuristics.

- **metadata**: An object containing contextual information about the reasoning request. Fields include requestTimestamp as ISO timestamp, correlationId for tracing across services, source indicating whether request originated from api, web, or mobile, quoteVersion for versioning intelligence rules, and clientPreferences capturing any explicit preferences expressed by the customer such as budget constraints or service level requirements.

- **locationContext**: An optional object containing normalized origin and destination locations. Each location includes formatted address, latitude, longitude, locality, region, country, and postal code. This data is sourced from LocationNormalizationService.

- **policyContext**: An optional array of PolicyAdjustment objects representing applicable policies. Each adjustment includes policy identifier, type as discount or surcharge, name, amount, and description. This data is sourced from applyPolicyAdjustments method.

### Sources and Relationships

The IntelligenceContext is built through a composition pattern, aggregating data from existing services without altering their behavior or the Order entities they wrap.

MoveProfile is obtained from AIMoveProfileService.interpretHouseSize(), which accepts MoversEstimateRequestDto and returns a computed MoveProfile. This service already implements the fallback logic from house size to detailed requirements, making it the authoritative source for profile data.

AvailableVehicles are obtained from VehicleMatchingService.findMatchingVehicles(), which accepts MoveProfile and returns ranked VehicleRecommendation objects. The underlying VehicleCapabilityProfile data comes from VEHICLE_CAPABILITY_DEFAULTS constant and is filtered by capacity and capability requirements.

DemandSignals are computed from the requestedDate field within MoversEstimateRequestDto. The calculateDemandMultiplier function in move-estimate.ts provides the demandMultiplier calculation based on day of week, month-end periods, peak seasons, and holiday proximity.

LocationContext is sourced from LocationNormalizationService.normalize(), which accepts raw location inputs from the request and returns normalized NormalizedLocation objects with consistent structure.

PolicyContext is sourced from the private applyPolicyAdjustments method within MoversQuoteOrchestrator. This method evaluates MoveProfile attributes against policy rules and returns applicable adjustments.

The composition occurs in a dedicated IntelligenceContextBuilder service that orchestrates these sources without modifying any existing orchestrators or entities. The builder follows the dependency inversion principle, accepting service interfaces rather than concrete implementations.

## 2. MoveIntelligenceEngine

### Description

MoveIntelligenceEngine is a reasoning layer that accepts IntelligenceContext and returns structured recommendations for vehicle selection, pricing adjustments, and risk assessment. The engine implements configurable decision rules and scoring algorithms to produce deterministic, auditable recommendations.

The engine is designed as a stateless processor that can be invoked synchronously during quote orchestration or asynchronously for batch processing scenarios. Each invocation produces a versioned recommendation that can be traced back to the IntelligenceContext that generated it.

The engine operates in three phases: feasibility analysis, optimization scoring, and recommendation synthesis. During feasibility analysis, the engine validates that the MoveProfile requirements can be satisfied by available vehicles. During optimization scoring, the engine evaluates trade-offs between vehicle capacity, cost, and risk factors. During recommendation synthesis, the engine produces the final recommendation object.

### Interface Specification

**MoveIntelligenceEngine**

- **Input**: IntelligenceContext object containing MoveProfile, availableVehicles, demandSignals, metadata, locationContext, and policyContext.

- **Output**: MoveRecommendation object containing recommendationTimestamp, intelligenceVersion, vehicleRecommendation, pricingAdjustment, riskAssessment, confidenceScore, reasoning链条, and alternatives.

**VehicleRecommendation**

- **selectedVehicle**: A VehicleCapabilityProfile object representing the primary recommended vehicle. This vehicle satisfies all MoveProfile requirements and achieves the highest optimization score.

- **matchScore**: A decimal between zero and one hundred indicating how well the selected vehicle matches the MoveProfile requirements. Scores above eighty indicate excellent fit, scores between sixty and eighty indicate good fit, and scores below sixty indicate marginal fit requiring customer acknowledgment.

- **alternativeVehicles**: An array of VehicleCapabilityProfile objects representing secondary options ordered by descending match score. Each alternative includes its match score and a brief explanation of why it may be preferred such as cost savings or availability.

**PricingAdjustment**

- **baseAdjustment**: A decimal representing percentage adjustment to base pricing. Positive values indicate premium charges, negative values indicate discounts.

- **demandAdjustment**: A decimal representing percentage adjustment due to demand signals. This derives from the demandMultiplier in IntelligenceContext.

- **complexityAdjustment**: A decimal representing percentage adjustment due to move complexity factors such as high fragility, special items, or floor count without elevator.

- **totalAdjustment**: A decimal representing the sum of all adjustments as a percentage.

- **explanation**: A human-readable string explaining the pricing logic for transparency.

**RiskAssessment**

- **overallRiskScore**: A decimal between zero and one hundred indicating overall move risk. Scores below thirty indicate low risk, scores between thirty and sixty indicate moderate risk, and scores above sixty indicate high risk requiring additional precautions.

- **riskFactors**: An array of objects each containing factorName, severity as low medium or high, and mitigation suggesting customer action or service requirement.

- **requiredPrecautions**: An array of strings listing necessary precautions such as specific vehicle features, additional insurance, or crew certifications.

- **successProbability**: A decimal between zero and one indicating estimated probability of successful completion based on historical data patterns.

**MoveRecommendation**

- **recommendationTimestamp**: ISO timestamp when the recommendation was generated.

- **intelligenceVersion**: Semantic version string identifying the intelligence rules version.

- **vehicleRecommendation**: VehicleRecommendation object with selected vehicle, match score, and alternatives.

- **pricingAdjustment**: PricingAdjustment object with base, demand, complexity adjustments and total.

- **riskAssessment**: RiskAssessment object with overall score, factors, precautions, and success probability.

- **confidenceScore**: Decimal between zero and one indicating confidence in the recommendation quality based on data completeness and rule applicability.

- **reasoningChain**: Array of objects each containing stepName, decision, and supportingData, creating an auditable trace of the reasoning process.

- **alternatives**: Array of MoveRecommendation objects representing alternative approaches such as premium service level or budget-optimized options.

### Engine Operation Phases

**Phase 1: Feasibility Analysis**

The engine first validates that available vehicles can satisfy MoveProfile requirements. It checks volume capacity, labor capacity, load type compatibility, special feature requirements such as liftgate or climate control, and floor access capabilities. If no vehicle satisfies all requirements, the engine returns an infeasibility recommendation identifying missing capabilities.

**Phase 2: Optimization Scoring**

For all feasible vehicles, the engine calculates an optimization score based on weighted criteria. Volume fit contributes forty percent weight, penalizing over-capacity vehicles more heavily than under-capacity. Labor fit contributes twenty percent weight, penalizing under-staffing severely. Special feature match contributes twenty percent weight, with exact matches rewarded. Cost efficiency contributes twenty percent weight, favoring lower estimated prices when fit is equivalent.

The engine also incorporates demand signals into scoring, applying availability penalties during high-demand periods for vehicles in limited supply.

**Phase 3: Recommendation Synthesis**

The engine selects the highest-scoring vehicle as the primary recommendation and generates the complete MoveRecommendation object. It calculates pricing adjustments by aggregating demand multiplier effects, complexity surcharges based on fragility and special items, and policy adjustments from the context.

Risk assessment combines fragility level, floor count without elevator, special item complexity, distance category, and demand volatility into an overall risk score. The engine identifies specific risk factors and recommends mitigations.

The reasoning chain captures each significant decision point including feasibility outcomes, scoring rationale, selection justification, and risk factor identification.

### Versioning Strategy

The intelligence engine uses semantic versioning with major version changes for rule changes that affect recommendations, minor version changes for new output fields or enhanced scoring, and patch version changes for bug fixes or performance improvements.

Each recommendation includes the intelligenceVersion field, enabling traceability and rollback capabilities. The version is derived from a constant within the engine module.

### Test Structure

The MoveIntelligenceEngine test suite follows the arrange-act-assert pattern with three test categories: unit tests for individual scoring functions, integration tests for end-to-end recommendation generation, and scenario tests for complex edge cases.

Unit tests cover scoring functions such as calculateVolumeScore, calculateLaborScore, calculateFeatureScore, and calculateCostScore. Each function receives controlled inputs and asserts expected outputs.

Integration tests cover complete context-to-recommendation flows using representative IntelligenceContext objects. Tests verify that the complete recommendation object is well-formed and that scoring reflects the expected priorities.

Scenario tests cover edge cases including no available vehicles, all vehicles equivalent score, high-demand periods, complex special items, and conflicting requirements. Each scenario documents the expected recommendation behavior.

Tests are located in modules/movers/tests/unit/move-intelligence-engine.spec.ts for unit tests and modules/movers/tests/integration/move-intelligence-engine.integration.spec.ts for integration tests.

### Documentation Structure

The intelligence layer documentation includes this architectural overview, API documentation for IntelligenceContext and MoveIntelligenceEngine interfaces, versioning changelog documenting rule changes by version, and decision logs explaining rationale for significant architectural choices.

Documentation is maintained in docs/architecture/move-intelligence-layer.md with references from module-level READMEs.
