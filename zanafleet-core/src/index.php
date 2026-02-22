<?php

declare(strict_types=1);

/**
 * ZanaFleet Core Library
 * 
 * Platform-agnostic PHP SDK for ZanaFleet delivery API.
 * Compatible with WooCommerce, Magento, and other PHP-based e-commerce platforms.
 */

namespace ZanaFleet\Core;

// Configuration
use ZanaFleet\Core\Configuration\ZanaFleetConfig;

// Models
use ZanaFleet\Core\Models\Address;
use ZanaFleet\Core\Models\Delivery;
use ZanaFleet\Core\Models\DeliveryQuote;
use ZanaFleet\Core\Models\DeliveryRequest;
use ZanaFleet\Core\Models\DeliveryStatus;
use ZanaFleet\Core\Models\PackageDetails;
use ZanaFleet\Core\Models\SLAOptions;
use ZanaFleet\Core\Models\VehicleType;

// Client
use ZanaFleet\Core\Client\ZanaFleetClient;

// Exceptions
use ZanaFleet\Core\Exceptions\ApiException;
use ZanaFleet\Core\Exceptions\AuthenticationException;
use ZanaFleet\Core\Exceptions\DeliveryConflictException;
use ZanaFleet\Core\Exceptions\ZanaFleetException;

// Webhooks
use ZanaFleet\Core\Webhooks\WebhookEvent;

// Export public API
class_alias(ZanaFleetConfig::class, 'ZanaFleetConfig');
class_alias(Address::class, 'Address');
class_alias(Delivery::class, 'Delivery');
class_alias(DeliveryQuote::class, 'DeliveryQuote');
class_alias(DeliveryRequest::class, 'DeliveryRequest');
class_alias(DeliveryStatus::class, 'DeliveryStatus');
class_alias(PackageDetails::class, 'PackageDetails');
class_alias(SLAOptions::class, 'SLAOptions');
class_alias(VehicleType::class, 'VehicleType');
class_alias(ZanaFleetClient::class, 'ZanaFleetClient');
class_alias(WebhookEvent::class, 'WebhookEvent');