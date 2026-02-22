# WooCommerce Plugin → NestJS Services Capability Mapping

## Overview
This document maps ZanaFleet WooCommerce plugin capabilities to existing NestJS backend services.

## WooCommerce Plugin Capabilities

### 1. Delivery Quotes (`ZanaFleetClient::createQuote`)
- **Endpoint**: `POST /api/v1/quotes`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:40)
- **NestJS Service**: [`BillingCalculatorService`](apps/api/src/modules/billing/services/billing-calculator.service.ts:1)
- **Status**: ✅ IMPLEMENTED
- **Controller**: [`POST /deliveries/quotes`](apps/api/src/modules/delivery/controllers/deliveries.controller.ts:129)

### 2. Delivery Creation (`ZanaFleetClient::createDelivery`)
- **Endpoint**: `POST /api/v1/deliveries`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:49)
- **NestJS Service**: [`DeliveryRequestCoordinator`](apps/api/src/modules/delivery/coordinators/delivery-request.coordinator.ts:1) / [`DeliveryLifecycleCoordinator`](apps/api/src/modules/delivery/coordinators/delivery-lifecycle.coordinator.ts:1)
- **Status**: ⚠️ NEEDS ADAPTER
- **Existing Endpoint**: `POST /deliveries/request` - Slightly different DTO structure

### 3. Delivery Retrieval (`ZanaFleetClient::getDelivery`)
- **Endpoint**: `GET /api/v1/deliveries/{id}`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:63)
- **NestJS Service**: [`DeliveryEntity`](apps/api/src/modules/delivery/entities/delivery.entity.ts:1) + Repository
- **Status**: ✅ EXISTS
- **Existing Endpoint**: `GET /deliveries/:id`

### 4. Delivery by External ID (`ZanaFleetClient::getDeliveryByExternalId`)
- **Endpoint**: `GET /api/v1/deliveries?externalOrderId=`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:72)
- **NestJS Service**: [`DeliveryEntity`](apps/api/src/modules/delivery/entities/delivery.entity.ts:1)
- **Status**: ⚠️ NEEDS externalOrderId filter
- **Add filter**: Add externalOrderId to DeliveryEntity and filter in findAll

### 5. Delivery Cancellation (`ZanaFleetClient::cancelDelivery`)
- **Endpoint**: `POST /api/v1/deliveries/{id}/cancel`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:91)
- **NestJS Service**: [`CancelDeliveryHandler`](apps/api/src/modules/delivery/handlers/cancel-delivery.handler.ts:1)
- **Status**: ⚠️ NEEDS endpoint adapter
- **Existing**: `POST /deliveries/:id/transition` with targetState=CANCELLED

### 6. Webhook Registration (`ZanaFleetClient::registerWebhook`)
- **Endpoint**: `POST /api/v1/webhooks`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:101)
- **NestJS Service**: NONE - Needs new module
- **Status**: ❌ NOT IMPLEMENTED

### 7. Webhook Listing (`ZanaFleetClient::listWebhooks`)
- **Endpoint**: `GET /api/v1/webhooks`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:114)
- **NestJS Service**: NONE - Needs new module
- **Status**: ❌ NOT IMPLEMENTED

### 8. Webhook Deletion (`ZanaFleetClient::deleteWebhook`)
- **Endpoint**: `DELETE /api/v1/webhooks/{id}`
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:123)
- **NestJS Service**: NONE - Needs new module
- **Status**: ❌ NOT IMPLEMENTED

### 9. Webhook Signature Verification (`ZanaFleetClient::verifyWebhookSignature`)
- **WooCommerce**: [`ZanaFleetClient.php`](zanafleet_woocommerce/includes/lib/Client/ZanaFleetClient.php:131)
- **NestJS Service**: NONE - Needs new module
- **Status**: ❌ NOT IMPLEMENTED

## Data Model Mapping

### WooCommerce DeliveryRequest → NestJS
```php
// WooCommerce (DeliveryRequest.php)
[
  'businessId' => '...',
  'workspaceId' => '...', 
  'actorId' => '...',
  'pickup' => Address,
  'dropoff' => Address,
  'recipientName' => '...',
  'recipientPhone' => '...',
  'itemId' => '...',
  'itemDescription' => '...',
  'scheduledPickupTime' => '...',
  'declaredItemValue' => '...',
  'specialInstructions' => '...',
  'distanceKm' => '...',
  'vehicleType' => '...',
]
```

Maps to NestJS:
- [`RequestDeliveryDto`](apps/api/src/modules/delivery/controllers/deliveries.controller.ts:46)
- [`LocationPinInput`](apps/api/src/modules/delivery/coordinators/delivery-request.coordinator.ts:10)

### WooCommerce DeliveryQuote → NestJS
```php
// WooCommerce expects:
[
  'quoteId' => '...',
  'basePrice' => 200,
  'distancePrice' => 250,
  'totalPrice' => 450,
  'currency' => 'KES',
  'distanceKm' => 5.0,
  'estimatedPickupMinutes' => 15,
  'estimatedDeliveryMinutes' => 30,
  'vehicleType' => 'motorbike',
  'expiresAt' => '2024-01-01T12:00:00Z',
]
```

Maps to NestJS:
- [`BillingCalculatorService.calculateDeliveryCharges()`](apps/api/src/modules/billing/services/billing-calculator.service.ts:88)

## Integration Points

### Authentication
- WooCommerce sends: API Key in headers (`X-API-Key`)
- NestJS expects: JWT + Capability Guards
- **Solution**: Use [`SandboxAuthGuard`](apps/api/src/modules/auth/guards/sandbox-auth.guard.ts:1) in sandbox mode

### Event-Driven Integration
Use existing Event Bus:
1. [`DeliveryCreatedEvent`](apps/api/src/modules/delivery/events/delivery-created.event.ts:1)
2. [`DeliveryAssignedEvent`](apps/api/src/modules/delivery/events/delivery-assigned.event.ts:1)
3. [`DeliveryPickedUpEvent`](apps/api/src/modules/delivery/events/delivery-picked-up.event.ts:1)
4. [`DeliveryDeliveredEvent`](apps/api/src/modules/delivery/events/delivery-delivered.event.ts:1)
5. [`DeliveryCancelledEvent`](apps/api/src/modules/delivery/events/delivery-cancelled.event.ts:1)

## Implementation Priority

1. **P0 (Critical)**:
   - [x] Quotes endpoint (using BillingCalculatorService)
   - [ ] ExternalOrderId filter on deliveries list
   - [ ] Cancel endpoint adapter

2. **P1 (Important)**:
   - [ ] Webhook module (register, list, delete)
   - [ ] API key authentication

3. **P2 (Nice to Have)**:
   - [ ] Webhook signature verification
   - [ ] Event publishing to WooCommerce
