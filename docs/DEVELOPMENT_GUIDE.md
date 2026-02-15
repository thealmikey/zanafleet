# ZanaFleet Development Guide

## Overview

This guide provides detailed instructions for developing, testing, and debugging features in the ZanaFleet platform, with a special focus on the Media Insight feature.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn package manager
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/zanafleet/zanafleet.git
cd zanafleet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` to configure your environment:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=zanafleet

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j

# Media Perception Feature
MEDIA_PERCEPTION_ENABLED=false
MEDIA_PERCEPTION_CONFIDENCE_THRESHOLD=0.7
MEDIA_PERCEPTION_OVERRIDE_THRESHOLD=0.85
MEDIA_PERCEPTION_TIMEOUT_MS=30000
MEDIA_PERCEPTION_ASYNC=true
MEDIA_PERCEPTION_PROVIDER=noop

# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_VISION_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
```

### 4. Start Development Services

```bash
# Start all required services
docker-compose up -d

# Verify services are running
docker-compose ps
```

## Media Insight Feature Development

### Enabling the Feature

To develop and test the Media Insight feature, you need to enable it in your environment:

```env
MEDIA_PERCEPTION_ENABLED=true
MEDIA_PERCEPTION_PROVIDER=openai
```

### Testing with Real AI Analysis

For real AI analysis, configure your OpenAI API key:

```env
OPENAI_API_KEY=your-api-key-here
```

### Testing with Mock Data

For quick testing without real AI calls, use the `noop` provider:

```env
MEDIA_PERCEPTION_PROVIDER=noop
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run only Media Insight unit tests
npm run test:unit -- apps/api/src/modules/movers/media-insight/tests/unit/

# Run tests in watch mode
npm run test:unit -- --watch
```

### Integration Tests

```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Run only Media Insight integration tests
npm run test:integration -- apps/api/src/modules/movers/media-insight/tests/integration/

# Stop test services
docker-compose -f docker-compose.test.yml down
```

### Test Coverage

```bash
# Run tests with coverage
npm run test:unit -- --coverage
```

## Debugging

### Log Levels

Set log level to `debug` in `.env` for detailed debugging:

```env
LOG_LEVEL=debug
```

### Debugging in VSCode

Add this configuration to your `launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to NestJS",
  "port": 9229,
  "restart": true,
  "protocol": "inspector"
}
```

Start the application in debug mode:

```bash
npm run start:debug
```

### Media Insight Specific Debugging

#### Check if Feature is Enabled

```typescript
// In your code
console.log('Media Perception Enabled:', process.env.MEDIA_PERCEPTION_ENABLED);
console.log('Media Perception Provider:', process.env.MEDIA_PERCEPTION_PROVIDER);
```

#### Trace Media Analysis Flow

```typescript
// Add debugging to MediaPerceptionAdapter
import { Logger } from '@nestjs/common';
const logger = new Logger('MediaPerceptionAdapter');

// In analyzeMedia method
logger.debug('Analyzing media:', mediaRefs);
logger.debug('Using provider:', this.provider.constructor.name);
```

## Code Structure

### Project Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Project Structure                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                      apps/                              │ │
│  │  - api/              # NestJS backend API               │ │
│  │    - src/            # Source code                       │ │
│  │      - core/         # Core infrastructure               │ │
│  │      - modules/      # Domain modules                    │ │
│  │        - movers/     # Movers module (move estimation)  │ │
│  │          - media-insight/  # Media Insight feature      │ │
│  │            - commands/    # CQRS commands                │ │
│  │            - config/      # Configuration                │ │
│  │            - dto/         # Data transfer objects        │ │
│  │            - entities/    # Database entities            │ │
│  │            - events/      # Domain events                │ │
│  │            - handlers/    # Command handlers             │ │
│  │            - interfaces/  # TypeScript interfaces        │ │
│  │            - providers/   # Vision AI providers          │ │
│  │            - services/    # Business services             │ │
│  │            - subscribers/ # Event subscribers            │ │
│  │            - tests/       # Tests (unit, integration)    │ │
│  │            - utils/       # Utility functions             │ │
│  │  - web-admin/       # Admin frontend                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                      docs/                              │ │
│  │  - architecture/     # Architectural documentation    │ │
│  │  - dev/              # Development guides               │ │
│  │  - prompts/          # AI prompt templates              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                     packages/                           │ │
│  │  - shared/           # Shared libraries                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Media Insight File Organization

```
apps/api/src/modules/movers/media-insight/
├── commands/
│   └── analyze-media.command.ts       # CQRS command
├── config/
│   └── media-perception.config.ts     # Feature configuration
├── dto/
│   └── media-insight.dto.ts          # DTOs for API
├── entities/
│   └── intelligence-snapshot.entity.ts # Database entity
├── events/
│   └── media-insight.events.ts       # Domain events
├── handlers/
│   └── analyze-media.handler.ts      # Command handler
├── interfaces/
│   ├── media-insight.interface.ts    # Core interface
│   └── media-insight-result.interface.ts
├── providers/
│   ├── noop-vision.provider.ts       # Mock provider for testing
│   ├── openai-vision.provider.ts     # OpenAI implementation
│   └── vision-provider.interface.ts  # Provider interface
├── services/
│   ├── intelligence-snapshot.service.ts  # Storage service
│   ├── media-perception-adapter.service.ts  # Main orchestrator
│   └── media-perception-feature.service.ts # Feature toggle
├── subscribers/
│   └── media-insight.subscriber.ts   # Event subscriber
├── tests/
│   ├── integration/
│   │   └── media-perception.integration.spec.ts
│   └── unit/
│       ├── intelligence-snapshot.service.spec.ts
│       ├── media-perception-adapter.service.spec.ts
│       └── media-perception-feature.service.spec.ts
└── utils/
    └── media-insight.utils.ts        # Utility functions
```

## Adding New Features

### Creating a New Vision Provider

1. Implement the `IVisionProvider` interface:

```typescript
// apps/api/src/modules/movers/media-insight/providers/my-vision.provider.ts
import { Injectable } from '@nestjs/common';
import { IVisionProvider, MediaReference, MediaInsight } from './vision-provider.interface';

@Injectable()
export class MyVisionProvider implements IVisionProvider {
  async analyze(mediaRefs: MediaReference[]): Promise<MediaInsight> {
    // Your implementation here
    return {
      schemaVersion: '1.0.0',
      detectedItems: [],
      estimatedTotalVolumeM3: 0,
      estimatedLaborIntensity: 1,
      fragilityScore: 0,
      specialHandlingRequired: false,
      perceptionConfidence: 0.8,
      modelVersion: 'my-model-v1',
      analyzedAt: new Date().toISOString(),
    };
  }
}
```

2. Add to provider registry:

```typescript
// apps/api/src/modules/movers/media-insight/providers/index.ts
import { MyVisionProvider } from './my-vision.provider';

export const VisionProviders = {
  noop: NoOpVisionProvider,
  openai: OpenAIVisionProvider,
  myprovider: MyVisionProvider, // Add new provider
};
```

3. Update configuration:

```typescript
// apps/api/src/modules/movers/media-insight/config/media-perception.config.ts
export const MediaPerceptionConfig = registerAs('mediaPerception', () => ({
  // ... existing config
  provider: process.env.MEDIA_PERCEPTION_PROVIDER || 'noop',
  // Add new provider to validation
  validProviders: ['noop', 'openai', 'myprovider'],
}));
```

### Extending MediaInsight Schema

When updating the MediaInsight interface:

1. Create new version interface:

```typescript
// apps/api/src/modules/movers/media-insight/interfaces/media-insight-v2.interface.ts
export interface MediaInsightV2 extends MediaInsight {
  newField: string;
  additionalData?: any;
}
```

2. Update version detection:

```typescript
// apps/api/src/modules/movers/media-insight/utils/media-insight.utils.ts
export function detectSchemaVersion(insight: any): string {
  if ('newField' in insight) {
    return '2.0.0';
  }
  return '1.0.0';
}
```

3. Create migration logic:

```typescript
// apps/api/src/modules/movers/media-insight/utils/media-insight.utils.ts
export function migrateMediaInsight(insight: any): MediaInsight {
  const version = detectSchemaVersion(insight);
  
  if (version === '1.0.0') {
    return migrateV1toV2(insight);
  }
  
  return insight;
}

function migrateV1toV2(insight: MediaInsightV1): MediaInsightV2 {
  return {
    ...insight,
    schemaVersion: '2.0.0',
    newField: 'default-value',
  };
}
```

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix fixable issues
npm run lint:fix
```

### Formatting

```bash
# Check with Prettier
npm run format:check

# Auto-format
npm run format:write
```

### CI Pipeline

```bash
# Run complete CI pipeline
npm run ci:all

# Or use Makefile
make ci
```

## Common Development Scenarios

### Scenario 1: Media Analysis Not Triggered

**Symptoms**: Media is uploaded but no analysis happens

**Troubleshooting Steps**:
1. Check if feature toggle is enabled (`MEDIA_PERCEPTION_ENABLED=true`)
2. Verify media files are accessible (URLs must be publicly accessible for AI analysis)
3. Check media format (only images and videos supported)
4. Look for errors in application logs

### Scenario 2: OpenAI API Errors

**Symptoms**: Media analysis fails with OpenAI API errors

**Troubleshooting Steps**:
1. Verify OpenAI API key is configured and valid
2. Check API key permissions and rate limits
3. Verify model name is correct (`gpt-4o` is recommended)
4. Check API endpoint availability

### Scenario 3: Low Confidence Scores

**Symptoms**: AI returns low confidence (<0.7) insights

**Troubleshooting Steps**:
1. Check image quality (should be clear and well-lit)
2. Ensure items are visible and not occluded
3. Upload multiple angles of the same item
4. Adjust confidence threshold in configuration

## Performance Optimization

### 1. Batch Processing

For large datasets, use batch processing:

```typescript
const batchSize = 10;
for (let i = 0; i < mediaRefs.length; i += batchSize) {
  const batch = mediaRefs.slice(i, i + batchSize);
  const results = await mediaPerceptionAdapter.analyzeMedia(batch);
  // Process results
}
```

### 2. Caching

Implement caching for repeated media analysis:

```typescript
const cacheKey = `media-insight:${hash(mediaRefs)}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const result = await mediaPerceptionAdapter.analyzeMedia(mediaRefs);
await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // Cache for 1 hour

return result;
```

### 3. Rate Limiting

Implement rate limiting to avoid API throttling:

```typescript
import { RateLimiter } from 'some-rate-limiter-library';

const limiter = new RateLimiter({
  max: 10, // 10 requests per minute
  duration: 60000,
});

async function analyzeMediaWithRateLimit(mediaRefs: MediaReference[]) {
  await limiter.removeTokens(1);
  return mediaPerceptionAdapter.analyzeMedia(mediaRefs);
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on how to contribute to the project.

## Related Documentation

- [Movers Module Documentation](../apps/api/src/modules/movers/README.md)
- [Media Insight Integration Architecture](./architecture/media-insight-integration.md)
- [Move Intelligence Layer Architecture](./architecture/move-intelligence-layer.md)
- [API Reference](./API_REFERENCE.md)
