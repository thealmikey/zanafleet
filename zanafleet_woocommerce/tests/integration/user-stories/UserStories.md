# ZanaFleet WooCommerce Plugin - User Stories

## Overview
This document outlines 20 user stories for the ZanaFleet WooCommerce plugin, describing how it interacts with the ZanaFleet backend API.

---

## User Story 1: Guest Customer Gets Delivery Quote
**As a** guest customer (not logged in),  
**I want** to see delivery options and pricing at checkout,  
**So that** I can complete my purchase with delivery.

**Acceptance Criteria:**
- Guest can see delivery options at checkout
- Quote is generated with pricing
- Delivery address is captured
- Quote is valid for 5-60 minutes
- Multiple vehicle types shown for large packages

---

## User Story 2: Registered Customer Creates Delivery
**As a** registered customer,  
**I want** my delivery to be linked to my account,  
**So that** I can track my order history and manage deliveries.

**Acceptance Criteria:**
- Delivery linked to WooCommerce order
- Customer can retrieve delivery by order ID
- Can cancel pending deliveries
- Order history includes delivery status

---

## User Story 3: Real-Time Shipping Calculation
**As a** customer at checkout,  
**I want** to see real-time shipping costs,  
**So that** I know the exact total before paying.

**Acceptance Criteria:**
- Shipping updates when address changes
- Fuel surcharge included in calculation
- Package dimensions affect price

---

## User Story 4: Free Shipping Threshold
**As a** store owner,  
**I want** to offer free shipping above a certain order amount,  
**So that** I can encourage larger purchases.

**Acceptance Criteria:**
- Free shipping applies above threshold
- Paid shipping below threshold
- Works when enabled/disabled

---

## User Story 5: Delivery Time Slot Selection
**As a** customer,  
**I want** to select a delivery time slot,  
**So that** I can ensure someone is available to receive the package.

**Acceptance Criteria:**
- Time slots available in quote
- Time slots have valid ranges
- Selected slot saved with order

---

## User Story 6: Vehicle Type Selection
**As a** customer,  
**I want** to choose the type of vehicle for my delivery,  
**So that** I can select appropriate transport for my package size/value.

**Acceptance Criteria:**
- Multiple vehicle types shown
- Different prices for different vehicles
- Selected vehicle saved

---

## User Story 7: Order Cancellation
**As a** customer,  
**I want** to cancel my delivery order,  
**So that** I can change my mind before the package is picked up.

**Acceptance Criteria:**
- Can cancel pending deliveries
- Cannot cancel in-progress deliveries
- Refund info returned

---

## User Story 8: Delivery Tracking
**As a** customer,  
**I want** to track my delivery in real-time,  
**So that** I know exactly where my package is.

**Acceptance Criteria:**
- Can retrieve delivery status
- Timeline of events available
- Driver info when assigned
- Current location when in transit

---

## User Story 9: Bulk Order Processing
**As a** store owner with many orders,  
**I want** to process multiple orders at once,  
**So that** I can efficiently create deliveries in bulk.

**Acceptance Criteria:**
- Process single order
- Process multiple orders
- Respects tier limits
- Continues on failure

---

## User Story 10: Tier-Based Feature Access
**As a** store owner,  
**I want** features to be gated by my license tier,  
**So that** I can upgrade to access more features.

**Acceptance Criteria:**
- Free tier limited features
- Basic tier more features
- Pro tier all features
- Enforces limits correctly

---

## User Story 11: API Authentication
**As a** store owner,  
**I want** secure API authentication,  
**So that** only authorized users can access my account.

**Acceptance Criteria:**
- Valid credentials connect
- Invalid credentials rejected
- Missing credentials rejected
- Token refresh on expiry

---

## User Story 12: Webhook Handling
**As a** store owner,  
**I want** to receive webhook notifications for delivery updates,  
**So that** my order management system stays in sync.

**Acceptance Criteria:**
- Can verify webhook signature
- Process status update webhooks
- Process completed/failed webhooks
- Retry on failure

---

## User Story 13: Error Handling
**As a** store owner,  
**I want** clear error messages when something goes wrong,  
**So that** I can quickly identify and resolve issues.

**Acceptance Criteria:**
- Network errors helpful
- Rate limit includes retry info
- Validation errors descriptive
- Conflict errors handled

---

## User Story 14: Cache Management
**As a** store owner,  
**I want** delivery quotes to be cached,  
**So that** repeated requests are faster and reduce API calls.

**Acceptance Criteria:**
- Quotes are cached
- Cache expires after TTL
- Cache can be cleared
- Cache can be disabled

---

## User Story 15: Admin Order Management
**As a** store admin,  
**I want** to manage deliveries from the WooCommerce admin,  
**So that** I can handle orders efficiently.

**Acceptance Criteria:**
- View delivery status in order list
- Manually create delivery from order
- Cancel delivery from admin
- Bulk actions work

---

## User Story 16: SLA Options
**As a** store owner,  
**I want** to offer different SLA options,  
**So that** customers can choose delivery speed.

**Acceptance Criteria:**
- Quote includes SLA options
- Different prices for different SLAs
- Express more expensive than standard
- Selected SLA saved with delivery

---

## User Story 17: Cash on Delivery (COD) Handling
**As a** store owner,  
**I want** to offer cash on delivery option,  
**So that** customers who prefer paying upon delivery can do so.

**Acceptance Criteria:**
- Can create delivery with COD
- COD amount validated
- COD status updates on collection
- COD failure updates order

---

## User Story 18: Delivery Confirmation
**As a** customer,  
**I want** to confirm receipt of my delivery,  
**So that** I can verify the package arrived safely.

**Acceptance Criteria:**
- OTP generated for delivery
- Valid OTP required for confirmation
- Signature can be captured
- Confirmation updates delivery status

---

## User Story 19: Analytics and Reporting
**As a** store owner,  
**I want** to see delivery analytics,  
**So that** I can understand my delivery performance.

**Acceptance Criteria:**
- Delivery metrics available
- Time breakdown available
- Failure reasons categorized
- Revenue report available

---

## User Story 20: Elementor Widgets
**As a** store owner,  
**I want** to use Elementor widgets for delivery tracking,  
**So that** I can customize the tracking page.

**Acceptance Criteria:**
- Widget renders correctly
- Respects API response
- Shows error on invalid delivery
- Customizable and responsive

---

## Integration Points with Backend

| Feature | API Endpoint | Data Flow |
|---------|-------------|-----------|
| Get Quote | POST /api/v1/quotes | Request → Quote |
| Create Delivery | POST /api/v1/deliveries | Request → Delivery |
| Get Delivery | GET /api/v1/deliveries/{id} | Delivery |
| Cancel Delivery | POST /api/v1/deliveries/{id}/cancel | Delivery |
| Webhooks | POST /webhook | Event → Update Order |
