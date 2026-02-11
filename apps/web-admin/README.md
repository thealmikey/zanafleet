# Web Admin Dashboard

A React-based business admin dashboard for delivery management, built with TypeScript and following ZanaFleet's architectural patterns.

## Features

- **Create Delivery Orders**: Form with validation for creating new delivery orders with optional scheduling
- **Orders List**: Paginated table view with status filtering
- **Order Details**: Modal view with full order information
- **Assignment**: Manual or auto-assignment of riders/saccos to deliveries
- **Searchable Selects**: Async dropdown components for rider and sacco selection

## Tech Stack

- React 18 with TypeScript
- React Router for navigation
- React Hook Form with Zod validation
- Axios for API calls
- Tailwind CSS for styling
- Jest for testing

## Project Structure

```
apps/web-admin/
├── src/
│   ├── components/
│   │   ├── delivery/
│   │   │   ├── CreateOrderForm.tsx
│   │   │   ├── OrdersList.tsx
│   │   │   ├── OrderDetailsModal.tsx
│   │   │   ├── RiderSelect.tsx
│   │   │   └── SaccoSelect.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Modal.tsx
│   │       └── Badge.tsx
│   ├── hooks/
│   │   ├── useDeliveries.ts
│   │   ├── useRiders.ts
│   │   └── useSaccos.ts
│   ├── services/
│   │   └── api.ts
│   ├── pages/
│   │   └── DeliveryDashboard.tsx
│   ├── types/
│   │   └── delivery.ts
│   ├── App.tsx
│   └── index.tsx
├── package.json
├── tsconfig.json
└── jest.config.js
```

## Getting Started

### Installation

```bash
cd apps/web-admin
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test           # Run tests
npm run test:coverage  # Run tests with coverage
```

## API Integration

The dashboard integrates with the following backend endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/deliveries` | Create new delivery |
| GET | `/deliveries` | List all deliveries |
| GET | `/deliveries/:id` | Get delivery details |
| PATCH | `/deliveries/:id` | Update delivery |
| POST | `/deliveries/:id/assign` | Auto-assign delivery |
| GET | `/riders` | List all riders |
| GET | `/saccos` | List all saccos |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | `/api` |

## Testing Requirements

- Minimum 70% test coverage for all new modules
- Unit tests for hooks and components
- Integration tests for full workflows

## Coding Standards

Follow the ZanaFleet Coding Style Guide (AGENTS.md):
- Strict TypeScript mode
- Event-driven flow patterns
- Proper module isolation
- Named exports for all modules
