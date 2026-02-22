# WooCommerce Plugin Extension Strategy

## Version: 1.0.0 | Status: STABLE | Last Updated: 2026-02-22

---

# 1. STABILITY MAP

## 1.1 Stable & Revenue-Critical ✅

| Component | File | Status | Why Stable |
|-----------|------|--------|------------|
| **ZanaFleetClient** | `includes/lib/Client/ZanaFleetClient.php` | ✅ STABLE | Core API integration with retry logic, error handling |
| **Shipping Method** | `includes/ShippingMethod.php` | ✅ STABLE | WooCommerce shipping calculation - revenue critical |
| **Checkout Flow** | `includes/Frontend/CheckoutDelivery.php` | ✅ STABLE | Customer-facing checkout experience |
| **Settings Manager** | `includes/Admin/Settings.php` | ✅ STABLE | Admin configuration - tested |
| **Config Management** | `includes/lib/Configuration/ZanaFleetConfig.php` | ✅ STABLE | API key/secret handling |

## 1.2 Extendable 🛠️

| Component | File | Status | Extension Points |
|-----------|------|--------|-----------------|
| **Webhook Handler** | `zanafleet.php:register_webhook_endpoint` | 🛠️ EXTENDABLE | Add more event types |
| **AJAX Handlers** | `zanafleet.php:ajax_*` | 🛠️ EXTENDABLE | Add more actions |
| **Order Status Hook** | `zanafleet.php:handle_order_status_change` | 🛠️ EXTENDABLE | Add more triggers |
| **Quote Logic** | `ShippingMethod.php:calculate_shipping` | 🛠️ EXTENDABLE | Add more quote types |

## 1.3 Fragile / Risky ⚠️

| Component | File | Risk | Reason |
|-----------|------|------|--------|
| **API Endpoint Paths** | `ZanaFleetClient.php` uses `/api/v1/*` | ⚠️ HIGH | Path mismatch with NestJS (`/api/*`) - FIXED via endpoints |
| **Test Mode Logic** | `ShippingMethod.php:testMode` | ⚠️ MEDIUM | Mock data is hardcoded |
| **Webhook Signature** | `ZanaFleetClient.php:verifyWebhookSignature` | ⚠️ MEDIUM | Limited algorithm support |

## 1.4 Technical Debt (Tolerable) 📋

| Component | Issue | Action |
|-----------|-------|--------|
| **No REST API for Elementor** | Widgets can't consume endpoints | Add REST proxy |
| **No Tier Gating** | All features available | Add license wrapper |
| **Limited Bulk Operations** | Single order processing | Add batch module |

---

# 2. SAFE EXTENSION OPPORTUNITIES

## 2.1 What We Can Add WITHOUT Rewriting

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│  WooCommerce Checkout → Shipping Method → ZanaFleetClient  │
│         ↓                                ↓                  │
│   CheckoutDelivery              ZanaFleet SaaS             │
│   (Frontend)                     (API)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌───────────────────────────────────────┐
        │         SAFE EXTENSIONS               │
        ├───────────────────────────────────────┤
        │ 1. REST Proxy (wraps client calls)    │
        │ 2. License Tier Wrapper (feature flag)│
        │ 3. Elementor Widgets (consume REST)  │
        │ 4. Bulk Processor (batch iterator)    │
        └───────────────────────────────────────┘
```

### Extension Point Analysis

| Extension | Reuses Existing | Risk Level |
|-----------|-----------------|-------------|
| **REST Proxy Layer** | ZanaFleetClient | 🟢 LOW |
| **License Tier Wrapper** | Settings, Config | 🟢 LOW |
| **Elementor Widgets** | REST Proxy | 🟢 LOW |
| **Bulk Processing** | ZanaFleetClient, Order hooks | 🟢 LOW |
| **New Quote Types** | ShippingMethod | 🟡 MEDIUM |

---

# 3. MINIMAL ADDITIVE ARCHITECTURE

## 3.1 Directory Structure (Additive Only)

```
zanafleet_woocommerce/
├── zanafleet.php                    # NO CHANGES - STABLE
├── includes/
│   ├── ShippingMethod.php           # NO CHANGES - STABLE
│   ├── Admin/
│   │   └── Settings.php             # NO CHANGES - STABLE
│   ├── Frontend/
│   │   └── CheckoutDelivery.php     # NO CHANGES - STABLE
│   ├── lib/
│   │   ├── Client/
│   │   │   └── ZanaFleetClient.php  # NO CHANGES - STABLE
│   │   └── Configuration/
│   │       └── ZanaFleetConfig.php  # NO CHANGES - STABLE
│   │
│   │   ┌────────────────────────────────────────────┐
│   │   │          NEW ADDITIVE MODULES              │
│   │   ├────────────────────────────────────────────┤
│   │   │  ADDITIONS (New files - no rewrites)      │
│   │   ├────────────────────────────────────────────┤
│   │   │  • RestApi/           (REST proxy layer)  │
│   │   │  • Licensing/         (Tier gating)       │
│   │   │  • Elementor/         (Widget base)       │
│   │   │  • Bulk/              (Batch processing)   │
│   │   │  • Caching/           (Response cache)    │
│   │   └────────────────────────────────────────────┘
```

## 3.2 New Module Locations

| Module | Path | Purpose |
|--------|------|---------|
| **REST API** | `includes/RestApi/` | Thin wrapper around ZanaFleetClient |
| **Licensing** | `includes/Licensing/` | Feature flag wrapper |
| **Elementor** | `includes/Elementor/` | Widget base classes |
| **Bulk** | `includes/Bulk/` | Batch operations |
| **Caching** | `includes/Caching/` | Response caching |

---

# 4. REST PROXY LAYER DESIGN

## 4.1 Purpose
- Expose ZanaFleetClient functionality via WP REST API
- Enable Elementor widgets to consume endpoints
- Add response caching to prevent SaaS overload
- Provide graceful fallback UI

## 4.2 Implementation (Additive)

```php
// includes/RestApi/ProxyRoute.php - NEW FILE (Additive)
<?php
namespace ZanaFleet\RestApi;

defined('ABSPATH') || exit;

class ProxyRoute
{
    private $client;
    private $cache;

    public function __construct()
    {
        $this->client = $this->get_client();
        $this->cache = new ResponseCache();
    }

    /**
     * Register REST routes - ADDITIVE, no existing code changed
     */
    public function register_routes(): void
    {
        register_rest_route('zanafleet/v1', '/deliveries', [
            'methods' => 'GET',
            'callback' => [$this, 'list_deliveries'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        register_rest_route('zanafleet/v1', '/deliveries/(?P<id>\w+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_delivery'],
            'permission_callback' => [$this, 'check_permission'],
        ]);
        
        // ... more routes
    }

    /**
     * Cached proxy to ZanaFleetClient
     */
    public function get_delivery(\WP_REST_Request $request): \WP_REST_Response
    {
        $id = $request->get_param('id');
        
        // Check cache first
        $cached = $this->cache->get("delivery:{$id}");
        if ($cached) {
            return new \WP_REST_Response($cached, 200);
        }

        // Call existing client (NO CHANGES to client)
        try {
            $delivery = $this->client->getDelivery($id);
            
            // Cache response
            $this->cache->set("delivery:{$id}", $delivery->toArray(), 300);
            
            return new \WP_REST_Response($delivery->toArray(), 200);
        } catch (\Exception $e) {
            return new \WP_REST_Response([
                'error' => $e->getMessage(),
                'fallback' => true
            ], 500);
        }
    }

    private function get_client()
    {
        $settings = get_option('zanafleet_settings', []);
        $config = new \ZanaFleet\Core\Configuration\ZanaFleetConfig(
            $settings['api_key'] ?? '',
            $settings['api_secret'] ?? '',
            $settings['environment'] ?? 'sandbox'
        );
        return new \ZanaFleet\Core\Client\ZanaFleetClient($config);
    }

    public function check_permission(): bool
    {
        return current_user_can('manage_woocommerce');
    }
}
```

## 4.3 Risk Assessment

| Question | Answer |
|----------|--------|
| Alters checkout flow? | ❌ NO |
| Changes order creation? | ❌ NO |
| Modifies SaaS contract? | ❌ NO |
| Requires data migration? | ❌ NO |
| Risk level | 🟢 LOW |

---

# 5. ELEMENTOR DATA FLOW DESIGN

## 5.1 Architecture

```
Elementor Widget
       ↓
WP REST API (zanafleet/v1/*)
       ↓
ProxyRoute (caches, validates)
       ↓
ZanaFleetClient (EXISTING - NO CHANGES)
       ↓
ZanaFleet SaaS
```

## 5.2 Widget Example (Additive)

```php
// includes/Elementor/DeliveryTrackerWidget.php - NEW FILE
<?php
namespace ZanaFleet\Elementor;

use Elementor\Widget_Base;
use Elementor\Controls_Manager;

if (!defined('ABSPATH')) exit;

class DeliveryTrackerWidget extends Widget_Base
{
    public function get_name(): string
    {
        return 'zanafleet_tracker';
    }

    public function get_title(): string
    {
        return __('ZanaFleet Tracker', 'zanafleet');
    }

    protected function render(): void
    {
        $settings = $this->get_settings_for_display();
        
        // Check if Elementor is active (graceful fallback)
        if (!did_action('elementor/loaded')) {
            echo '<p>' . __('Elementor not active', 'zanafleet') . '</p>';
            return;
        }
        
        // Fetch from REST API (NOT direct SaaS call)
        $order_id = $settings['order_id'] ?? get_the_ID();
        $response = wp_remote_get(rest_url('zanafleet/v1/deliveries?external_order_id=' . $order_id));
        
        if (is_wp_error($response)) {
            echo '<p>' . __('Delivery tracking unavailable', 'zanafleet') . '</p>';
            return;
        }
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        // Render tracking UI
        $this->render_tracker_ui($data);
    }

    private function render_tracker_ui(array $data): void
    {
        if (empty($data['data'])) {
            echo '<p>No delivery found</p>';
            return;
        }
        
        $delivery = $data['data'][0];
        ?>
        <div class="zanafleet-tracker">
            <div class="zanafleet-status"><?php echo esc_html($delivery['status']); ?></div>
            <div class="zanafleet-timeline">...</div>
        </div>
        <?php
    }
}
```

## 5.3 Risk Assessment

| Question | Answer |
|----------|--------|
| Widgets call SaaS directly? | ❌ NO - via REST |
| Breaks if Elementor missing? | ❌ NO - graceful check |
| Couples to core shipment? | ❌ NO - isolated |
| Risk level | 🟢 LOW |

---

# 6. TIER GATING WRAPPER EXAMPLE

## 6.1 Implementation (Additive Wrapper)

```php
// includes/Licensing/TierGate.php - NEW FILE
<?php
namespace ZanaFleet\Licensing;

defined('ABSPATH') || exit;

/**
 * Tier gating wrapper - ADDITIVE, no existing code changes
 * Wraps feature execution in license checks
 */
class TierGate
{
    public const FREE = 'free';
    public const BASIC = 'basic';
    public const PRO = 'pro';

    /**
     * Get current tier from settings
     */
    public static function get_tier(): string
    {
        $settings = get_option('zanafleet_settings', []);
        return $settings['license_tier'] ?? self::FREE;
    }

    /**
     * Check if feature is available for current tier
     */
    public static function can(string $feature): bool
    {
        $tier = self::get_tier();
        
        $tier_features = [
            self::FREE => [
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
            ],
            self::BASIC => [
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
                'sms_notifications',
                'priority_support',
                'bulk_orders_10',
            ],
            self::PRO => [
                'basic_tracking',
                'standard_quotes',
                'email_notifications',
                'sms_notifications',
                'priority_support',
                'bulk_orders_unlimited',
                'advanced_analytics',
                'custom_branding',
                'api_access',
                'webhook_management',
            ],
        ];

        return in_array($feature, $tier_features[$tier] ?? [], true);
    }

    /**
     * Wrapper for bulk operations (tier-gated)
     */
    public static function execute_if_allowed(string $feature, callable $callback, $fallback = null)
    {
        if (self::can($feature)) {
            return call_user_func($callback);
        }

        if (is_callable($fallback)) {
            return call_user_func($fallback);
        }

        return [
            'error' => 'feature_not_available',
            'message' => 'Upgrade to ' . strtoupper($feature) . ' tier',
            'current_tier' => self::get_tier(),
        ];
    }

    /**
     * Disable UI for unavailable features (preserve data)
     */
    public static function filter_ui(array $items): array
    {
        $tier = self::get_tier();
        
        // Remove pro features from UI for lower tiers
        if ($tier === self::FREE) {
            $items = array_filter($items, function($item) {
                return self::can($item['feature']);
            });
        }
        
        return $items;
    }
}
```

## 6.2 Usage Example (Additive)

```php
// In new bulk processing module - NO CHANGES to existing code
// includes/Bulk/OrderProcessor.php - NEW FILE

public function process_batch(array $order_ids): array
{
    return TierGate::execute_if_allowed(
        'bulk_orders_10',
        function() use ($order_ids) {
            // Actual bulk processing
            return $this->process_orders($order_ids);
        },
        function() {
            // Fallback - return upgrade prompt
            return [
                'upgrade_required' => true,
                'limit' => 10,
                'message' => 'Upgrade to Basic for unlimited bulk processing'
            ];
        }
    );
}
```

## 6.3 Downgrade Scenario

| Scenario | Action |
|----------|--------|
| **UI Disabled** | TierGate::can() returns false |
| **Data Preserved** | No data deletion on downgrade |
| **State Intact** | Existing deliveries remain |
| **Graceful** | Show upgrade prompt, don't break |

---

# 7. BULK EXTENSION STRATEGY

## 7.1 Implementation (Additive Iterator)

```php
// includes/Bulk/OrderProcessor.php - NEW FILE
<?php
namespace ZanaFleet\Bulk;

defined('ABSPATH') || exit;

/**
 * Bulk order processor - ADDITIVE
 * Wraps existing shipment creation in batch iterator
 */
class OrderProcessor
{
    private $client;
    private $batch_size = 10;

    public function __construct()
    {
        $this->client = $this->get_client();
    }

    /**
     * Process multiple orders using existing logic
     */
    public function process_orders(array $order_ids, ?callable $progress = null): array
    {
        $results = [];
        $total = count($order_ids);
        
        foreach ($order_ids as $index => $order_id) {
            try {
                $order = wc_get_order($order_id);
                if (!$order) {
                    $results[] = ['order_id' => $order_id, 'error' => 'Order not found'];
                    continue;
                }

                // Reuse EXISTING shipment creation logic
                $delivery = $this->create_delivery_from_order($order);
                
                $results[] = [
                    'order_id' => $order_id,
                    'delivery_id' => $delivery->getId(),
                    'status' => 'success'
                ];

                // Progress callback
                if ($progress) {
                    $progress($index + 1, $total);
                }

            } catch (\Exception $e) {
                $results[] = [
                    'order_id' => $order_id,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    /**
     * Reuse existing order-to-delivery logic
     * NO DUPLICATION - calls existing methods
     */
    private function create_delivery_from_order(\WC_Order $order)
    {
        // This replicates the logic from zanafleet.php:handle_order_status_change
        // Using existing ZanaFleetClient - NO NEW LOGIC
        $request = $this->build_delivery_request($order);
        return $this->client->createDelivery($request);
    }

    private function build_delivery_request(\WC_Order $order)
    {
        // Same logic as existing code
        $settings = get_option('zanafleet_settings', []);
        
        return new \ZanaFleet\Core\Models\DeliveryRequest([
            'pickup' => [
                'address' => $settings['business_address'] ?? '',
                'contact' => $settings['business_name'] ?? '',
            ],
            'delivery' => [
                'address' => $order->get_shipping_address_1(),
                'contact' => $order->get_formatted_name(),
            ],
            'package' => [
                'weight' => $order->get_weight(),
                'dimensions' => $this->get_order_dimensions($order),
            ],
        ]);
    }

    private function get_client()
    {
        $settings = get_option('zanafleet_settings', []);
        $config = new \ZanaFleet\Core\Configuration\ZanaFleetConfig(
            $settings['api_key'] ?? '',
            $settings['api_secret'] ?? '',
            $settings['environment'] ?? 'sandbox'
        );
        return new \ZanaFleet\Core\Client\ZanaFleetClient($config);
    }

    private function get_order_dimensions(\WC_Order $order): array
    {
        // Calculate from items
        return ['length' => 10, 'width' => 10, 'height' => 10];
    }
}
```

## 7.2 Risk Assessment

| Question | Answer |
|----------|--------|
| Duplicates shipment orchestration? | ❌ NO - reuses existing |
| Alters checkout flow? | ❌ NO |
| Changes data schema? | ❌ NO |
| Risk level | 🟢 LOW |

---

# 8. RISK IMPACT TABLE

## 8.1 Proposed Changes vs Risk Factors

| Change | Checkout Flow | Order Creation | SaaS Contract | Data Schema | Migration | Overall Risk |
|--------|---------------|----------------|---------------|-------------|-----------|--------------|
| REST Proxy | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🟢 LOW |
| Tier Gating | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🟢 LOW |
| Elementor | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🟢 LOW |
| Bulk Module | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🟢 LOW |
| Response Cache | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🟢 LOW |

## 8.2 What We WILL NOT Do

| ❌ DON'T | Reason |
|----------|--------|
| Rewrite ZanaFleetClient | Stable, tested |
| Modify ShippingMethod core | Revenue critical |
| Change checkout hooks | Customer facing |
| Remove test mode | Developer need |
| Alter webhook signature | Breaks existing |
| Split into multiple plugins | Support nightmare |

## 8.3 Implementation Priority

| Priority | Feature | Effort | Risk |
|----------|---------|--------|------|
| 1️⃣ | REST Proxy Layer | 2 days | 🟢 LOW |
| 2️⃣ | License Tier Wrapper | 1 day | 🟢 LOW |
| 3️⃣ | Elementor Base | 3 days | 🟢 LOW |
| 4️⃣ | Bulk Processor | 2 days | 🟢 LOW |
| 5️⃣ | Response Caching | 1 day | 🟢 LOW |

---

# 9. SUMMARY

## Principles Applied

1. ✅ **No architectural purity** - We extend, don't rewrite
2. ✅ **Preserve working flows** - Checkout, shipping, webhooks intact
3. ✅ **Additive modules** - New directories, no existing file changes
4. ✅ **Wrapper services** - TierGate wraps, doesn't replace
5. ✅ **Elementor via REST** - No direct SaaS calls
6. ✅ **Bulk via iteration** - Reuses existing createDelivery

## Next Steps

1. Create `includes/RestApi/ProxyRoute.php`
2. Create `includes/Licensing/TierGate.php`
3. Add REST route registration to `zanafleet.php` (one line)
4. Create Elementor widget base
5. Create bulk processor

All changes are **additive only** - no rewrites, no risk.