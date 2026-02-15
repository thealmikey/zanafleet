# Movers Module Documentation

## Overview

The Movers module is a core component of the ZanaFleet platform that handles all aspects of move estimation, pricing, and vehicle matching. It integrates advanced AI capabilities to provide accurate moving quotes and recommendations based on customer-provided information.

## Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Movers Module                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                   Public API Layer                     │ │
│  │  - MoversController (move estimation endpoints)       │ │
│  │  - MediaInsight endpoints (media analysis)            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                 Orchestrators Layer                    │ │
│  │  - MoversQuoteOrchestrator (quote orchestration)      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               Intelligence Layer                       │ │
│  │  - IntelligenceContextBuilder (context aggregation)  │ │
│  │  - MoveIntelligenceEngine (AI reasoning & scoring)    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               Media Insight Layer                      │ │
│  │  - MediaPerceptionAdapter (AI integration)             │ │
│  │  - Vision AI Providers (OpenAI, NoOp for testing)      │ │
│  │  - IntelligenceSnapshotService (storage)               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              Core Services Layer                       │ │
│  │  - AIMoveProfileService (move profile calculation)    │ │
│  │  - VehicleMatchingService (vehicle selection)          │ │
│  │  - MoversPricingService (pricing calculations)         │ │
│  │  - VehicleRecommendationService (recommendations)      │ │
│  │  - LocationNormalizationService (location processing)  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                  Domain Models                          │ │
│  │  - MoveProfile (move requirements)                     │ │
│  │  - VehicleCapabilityProfile (vehicle capabilities)    │ │
│  │  - MediaInsight (AI analysis results)                   │ │
│  │  - IntelligenceSnapshot (snapshot storage)              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Media Insight Feature

### Overview

The Media Insight feature uses computer vision AI to analyze photos and videos uploaded by customers to improve moving estimates. It runs in the background without blocking the booking flow and enhances the accuracy of move profiles.

### Key Capabilities

- **Item Detection**: Identify and categorize items in photos (furniture, appliances, boxes, fragile items)
- **Volume Estimation**: Calculate total volume of items from media
- **Labor Estimation**: Estimate required labor intensity (1-5 scale)
- **Fragility Detection**: Determine overall fragility score (0-1)
- **Special Handling**: Identify items requiring special handling

### Architecture

```mermaid
flowchart TB
    subgraph Customer Booking Flow
        A[User books move and uploads photos/videos]
        B[Immediate legacy-based quote generated]
        C[Media analysis runs in background]
        D[MediaInsight generated and stored in snapshot]
        E[IntelligenceContextBuilder updates MoveProfile]
        F[MoveIntelligenceEngine provides improved recommendation]
    end
    
    subgraph Media Perception
        G[MediaPerceptionAdapter]
        H[Vision AI Provider (OpenAI, Google, Azure)]
    end
    
    A --> B
    A --> C
    C --> G
    G --> H
    H --> G
    G --> D
    D --> E
    E --> F
```

### Configuration

#### Environment Variables

```env
# Media Perception Feature
MEDIA_PERCEPTION_ENABLED=false         # Master toggle
MEDIA_PERCEPTION_CONFIDENCE_THRESHOLD=0.7
MEDIA_PERCEPTION_OVERRIDE_THRESHOLD=0.85
MEDIA_PERCEPTION_TIMEOUT_MS=30000
MEDIA_PERCEPTION_ASYNC=true
MEDIA_PERCEPTION_PROVIDER=noop

# Feature Flags
MEDIA_FEATURE_VOLUME=true
MEDIA_FEATURE_LABOR=true
MEDIA_FEATURE_FRAGILITY=true
MEDIA_FEATURE_ITEMS=true

# OpenAI Configuration
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
```

### Components

#### MediaPerceptionAdapter

Main service orchestrating media analysis.

**Methods**:
- `analyzeMedia(mediaRefs)`: Analyze media references and return structured MediaInsight
- Handles errors gracefully
- Never throws exceptions

#### MediaInsight Structure

```typescript
interface MediaInsight {
  schemaVersion: '1.0.0';
  detectedItems: {
    label: string;           // e.g. "sofa", "fridge"
    category: 'furniture' | 'appliance' | 'fragile' | 'box';
    sizeClass: 'small' | 'medium' | 'large';
    quantity: number;
  }[];
  estimatedTotalVolumeM3: number;
  estimatedLaborIntensity: number;   // 1–5 scale
  fragilityScore: number;            // 0–1
  specialHandlingRequired: boolean;
  perceptionConfidence: number;      // 0–1
  modelVersion: string;
  analyzedAt: string;
}
```

#### Intelligence Snapshot Storage

Intelligence snapshots are stored as JSONB entities:

```typescript
interface IntelligenceSnapshot {
  id: string;
  orderId: string;
  moveRecommendation: any;
  mediaInsightSummary: any;
  confidenceScore: number;
  intelligenceVersion: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Integration Points

1. **IntelligenceContextBuilder**: Merges MediaInsight into MoveProfile
2. **MoveIntelligenceEngine**: Consumes the refined MoveProfile
3. **Order Entity**: Stores intelligence snapshot as optional metadata
4. **Delivery Module**: Handles async processing and snapshot storage

### Feature Toggle

The feature is **disabled by default** for safety. To enable:

```bash
MEDIA_PERCEPTION_ENABLED=true
```

## Development Guide

### Prerequisites

- Node.js 18+
- Docker for integration tests
- OpenAI API key (for real AI analysis)

### Setting Up

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Configure OpenAI API key:

```env
OPENAI_API_KEY=your-api-key-here
```

3. Enable the feature:

```env
MEDIA_PERCEPTION_ENABLED=true
MEDIA_PERCEPTION_PROVIDER=openai
```

### Running Tests

#### Unit Tests

```bash
npm run test:unit -- apps/api/src/modules/movers/media-insight/tests/unit/
```

#### Integration Tests

```bash
# Start Docker services
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration -- apps/api/src/modules/movers/media-insight/tests/integration/

# Stop Docker services
docker-compose -f docker-compose.test.yml down
```

### Debugging

#### Log Levels

Set log level to `debug` in `.env`:

```env
LOG_LEVEL=debug
```

#### Testing with Mock Data

The feature includes a `noop` provider for testing without real AI calls:

```env
MEDIA_PERCEPTION_PROVIDER=noop
```

### Adding New Vision Providers

1. Implement `IVisionProvider` interface
2. Add provider to the provider registry
3. Update configuration options
4. Write tests

Example:

```typescript
export class MyVisionProvider implements IVisionProvider {
  analyze(mediaRefs: MediaReference[]): Promise<MediaInsight> {
    // Implementation
  }
}
```

### Extending the Schema

When updating MediaInsight schema:

1. Create new version interface (e.g., `MediaInsightV2`)
2. Update version detection logic in utils
3. Create migration logic for existing snapshots
4. Update all dependent services

## API Reference

### Media Analysis

#### POST /api/v1/media/analyze

Analyze media references and return MediaInsight.

**Request Body**:
```json
{
  "mediaRefs": [
    { "url": "https://example.com/image.jpg", "type": "image" },
    { "url": "https://example.com/video.mp4", "type": "video" }
  ],
  "options": {
    "confidenceThreshold": 0.7,
    "features": ["volume", "labor", "fragility", "items"]
  }
}
```

**Response**:
```json
{
  "status": "success",
  "insight": {
    "schemaVersion": "1.0.0",
    "detectedItems": [
      { "label": "sofa", "category": "furniture", "sizeClass": "large", "quantity": 1 }
    ],
    "estimatedTotalVolumeM3": 5.5,
    "estimatedLaborIntensity": 3,
    "fragilityScore": 0.3,
    "specialHandlingRequired": false,
    "perceptionConfidence": 0.85,
    "modelVersion": "gpt-4o",
    "analyzedAt": "2024-01-15T10:30:00Z"
  },
  "processingTimeMs": 1234
}
```

### Intelligence Snapshot

#### GET /api/v1/intelligence-snapshots/:orderId

Get intelligence snapshot for an order.

**Response**:
```json
{
  "id": "snapshot-123",
  "orderId": "order-456",
  "moveRecommendation": {
    "vehicleType": "large_truck",
    "recommendedMovers": 3,
    "estimatedDurationMinutes": 120
  },
  "mediaInsightSummary": {
    "detectedItems": [
      { "label": "sofa", "category": "furniture", "sizeClass": "large", "quantity": 1 }
    ],
    "estimatedTotalVolumeM3": 15.5,
    "estimatedLaborIntensity": 4,
    "fragilityScore": 0.6
  },
  "confidenceScore": 0.85,
  "intelligenceVersion": "1.0.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### PUT /api/v1/intelligence-snapshots/:id

Update intelligence snapshot.

**Request Body**:
```json
{
  "confidenceScore": 0.9,
  "mediaInsightSummary": {
    "detectedItems": 5,
    "estimatedTotalVolumeM3": 12
  }
}
```

## Troubleshooting

### Common Issues

1. **Media analysis not triggered**: Check feature toggle is enabled
2. **API key errors**: Verify OpenAI API key configuration
3. **Null insight returned**: Check media URL accessibility and format
4. **Low confidence scores**: Ensure photos are clear and well-lit

## Related Documentation

- [Media Insight Integration Architecture](../docs/architecture/media-insight-integration.md)
- [Move Intelligence Layer Architecture](../docs/architecture/move-intelligence-layer.md)
- [Development Guide](../docs/DEVELOPMENT_GUIDE.md)
- [API Reference](../docs/API_REFERENCE.md)
