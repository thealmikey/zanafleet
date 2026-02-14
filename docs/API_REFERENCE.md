# ZanaFleet API Reference

## Overview

This document provides detailed API documentation for the ZanaFleet platform, with a focus on endpoints related to the Media Insight feature.

## Base URL

All API endpoints are relative to:

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer <your-access-token>
```

## Media Insight Endpoints

### Analyze Media

#### POST /media/analyze

Analyze media references (photos/videos) using AI vision to generate MediaInsight.

**Request Body**:
```json
{
  "mediaRefs": [
    { 
      "url": "https://example.com/image.jpg", 
      "type": "image",
      "metadata": {
        "filename": "living-room.jpg",
        "size": 2048000
      }
    },
    { 
      "url": "https://example.com/video.mp4", 
      "type": "video",
      "metadata": {
        "duration": 60,
        "size": 5000000
      }
    }
  ],
  "options": {
    "confidenceThreshold": 0.7,
    "features": ["volume", "labor", "fragility", "items"],
    "async": true
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
      { 
        "label": "sofa", 
        "category": "furniture", 
        "sizeClass": "large", 
        "quantity": 1,
        "confidence": 0.95
      },
      { 
        "label": "coffee table", 
        "category": "furniture", 
        "sizeClass": "medium", 
        "quantity": 1,
        "confidence": 0.88
      },
      { 
        "label": "box", 
        "category": "box", 
        "sizeClass": "small", 
        "quantity": 3,
        "confidence": 0.92
      }
    ],
    "estimatedTotalVolumeM3": 5.5,
    "estimatedLaborIntensity": 3,
    "fragilityScore": 0.3,
    "specialHandlingRequired": false,
    "perceptionConfidence": 0.85,
    "modelVersion": "gpt-4o",
    "analyzedAt": "2024-01-15T10:30:00Z"
  },
  "processingTimeMs": 1234,
  "async": false
}
```

**Parameters**:
- `mediaRefs`: Array of media references to analyze
- `options.confidenceThreshold`: Minimum confidence score for detected items (0-1)
- `options.features`: Features to include in analysis (volume, labor, fragility, items)
- `options.async`: Whether to process asynchronously

**Response Status Codes**:
- 200 OK: Analysis completed successfully
- 400 Bad Request: Invalid request body
- 401 Unauthorized: Authentication required
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

### Intelligence Snapshots

#### GET /intelligence-snapshots/:orderId

Get intelligence snapshot for an order.

**Response**:
```json
{
  "id": "snapshot-123",
  "orderId": "order-456",
  "moveRecommendation": {
    "vehicleType": "large_truck",
    "recommendedMovers": 3,
    "estimatedDurationMinutes": 120,
    "estimatedCost": 1500
  },
  "mediaInsightSummary": {
    "detectedItems": [
      { 
        "label": "sofa", 
        "category": "furniture", 
        "sizeClass": "large", 
        "quantity": 1 
      }
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

**Parameters**:
- `orderId`: Order ID for which to retrieve the snapshot

**Response Status Codes**:
- 200 OK: Snapshot found
- 404 Not Found: Snapshot not found for order
- 401 Unauthorized: Authentication required

#### PUT /intelligence-snapshots/:id

Update intelligence snapshot.

**Request Body**:
```json
{
  "confidenceScore": 0.9,
  "mediaInsightSummary": {
    "detectedItems": 5,
    "estimatedTotalVolumeM3": 12
  },
  "moveRecommendation": {
    "vehicleType": "medium_truck",
    "recommendedMovers": 2
  }
}
```

**Response**:
```json
{
  "id": "snapshot-123",
  "orderId": "order-456",
  "moveRecommendation": {
    "vehicleType": "medium_truck",
    "recommendedMovers": 2,
    "estimatedDurationMinutes": 90,
    "estimatedCost": 1200
  },
  "mediaInsightSummary": {
    "detectedItems": 5,
    "estimatedTotalVolumeM3": 12
  },
  "confidenceScore": 0.9,
  "intelligenceVersion": "1.0.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:45:00Z"
}
```

**Parameters**:
- `id`: Snapshot ID to update

**Response Status Codes**:
- 200 OK: Snapshot updated successfully
- 400 Bad Request: Invalid request body
- 404 Not Found: Snapshot not found
- 401 Unauthorized: Authentication required
- 500 Internal Server Error: Server error

### Media Insight Events

#### Webhook: MediaInsightGenerated

Triggered when media analysis completes.

**Payload**:
```json
{
  "event": "MediaInsightGeneratedV1",
  "data": {
    "orderId": "order-456",
    "mediaInsight": {
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
    "intelligenceSnapshotId": "snapshot-123"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "correlationId": "abc123"
}
```

## Movers Module Endpoints

### Get Move Estimate

#### POST /movers/estimate

Get moving estimate based on house size and other parameters.

**Request Body**:
```json
{
  "houseSize": "3-bedroom",
  "origin": {
    "address": "123 Main St",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "destination": {
    "address": "456 Oak Ave",
    "coordinates": {
      "latitude": 37.7890,
      "longitude": -122.4050
    }
  },
  "requestedDate": "2024-02-15T09:00:00Z"
}
```

**Response**:
```json
{
  "status": "success",
  "estimate": {
    "totalPrice": 1500,
    "vehicleType": "large_truck",
    "recommendedMovers": 3,
    "estimatedDurationMinutes": 120,
    "intelligenceSnapshotId": "snapshot-123"
  }
}
```

### Get Quote

#### POST /movers/quote

Get detailed moving quote with pricing breakdown.

**Request Body**:
```json
{
  "estimateId": "estimate-789",
  "customerDetails": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "mediaRefs": [
    { "url": "https://example.com/living-room.jpg", "type": "image" }
  ]
}
```

**Response**:
```json
{
  "status": "success",
  "quote": {
    "id": "quote-101",
    "totalPrice": 1500,
    "breakdown": {
      "basePrice": 1000,
      "distanceFee": 300,
      "laborFee": 200
    },
    "vehicleType": "large_truck",
    "recommendedMovers": 3,
    "estimatedDurationMinutes": 120,
    "intelligenceSnapshotId": "snapshot-456"
  }
}
```

## Data Transfer Objects (DTOs)

### MediaInsight

```typescript
interface MediaInsight {
  schemaVersion: '1.0.0';
  detectedItems: DetectedItem[];
  estimatedTotalVolumeM3: number;
  estimatedLaborIntensity: number;   // 1–5 scale
  fragilityScore: number;            // 0–1
  specialHandlingRequired: boolean;
  perceptionConfidence: number;      // 0–1
  modelVersion: string;
  analyzedAt: string;
}

interface DetectedItem {
  label: string;
  category: 'furniture' | 'appliance' | 'fragile' | 'box';
  sizeClass: 'small' | 'medium' | 'large';
  quantity: number;
  confidence?: number;
}
```

### IntelligenceSnapshot

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

### MediaReference

```typescript
interface MediaReference {
  url: string;
  type: 'image' | 'video';
  metadata?: {
    filename?: string;
    size?: number;
    duration?: number;
    width?: number;
    height?: number;
  };
}
```

### AnalyzeMediaRequest

```typescript
interface AnalyzeMediaRequest {
  mediaRefs: MediaReference[];
  options?: {
    confidenceThreshold?: number;
    features?: string[];
    async?: boolean;
  };
}
```

### AnalyzeMediaResponse

```typescript
interface AnalyzeMediaResponse {
  status: 'success' | 'error';
  insight?: MediaInsight;
  processingTimeMs?: number;
  async?: boolean;
  error?: string;
}
```

## Configuration

### Environment Variables

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

## Error Handling

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| MEDIA_001 | Media analysis disabled | Enable feature with MEDIA_PERCEPTION_ENABLED=true |
| MEDIA_002 | No media references provided | Include mediaRefs array in request |
| MEDIA_003 | Invalid media type | Only image and video types are supported |
| MEDIA_004 | API key not configured | Set OPENAI_API_KEY environment variable |
| MEDIA_005 | API rate limit exceeded | Wait and retry, or upgrade plan |
| MEDIA_006 | Media analysis timeout | Increase MEDIA_PERCEPTION_TIMEOUT_MS |
| MEDIA_007 | Low confidence result | Adjust confidence threshold or upload better media |
| MEDIA_008 | Provider not found | Check MEDIA_PERCEPTION_PROVIDER configuration |

### Error Response Format

```json
{
  "status": "error",
  "error": "MEDIA_004: API key not configured",
  "message": "OpenAI API key is required for media analysis",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| /media/analyze | 10 requests per minute per user |
| /intelligence-snapshots | 50 requests per minute per user |
| /movers/estimate | 20 requests per minute per user |
| /movers/quote | 10 requests per minute per user |

## Versioning

API endpoints follow semantic versioning:

- `v1`: Current stable version
- Breaking changes will increment major version (v2, v3, etc.)

## Related Documentation

- [Movers Module Documentation](../apps/api/src/modules/movers/README.md)
- [Media Insight Integration Architecture](./architecture/media-insight-integration.md)
- [Move Intelligence Layer Architecture](./architecture/move-intelligence-layer.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
