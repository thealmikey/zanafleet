'use strict';
/**
 * @zanafleet/contracts
 *
 * Shared DTOs, event interfaces, and type definitions for the ZanaFleet platform.
 * All cross-module contracts should be defined here to ensure consistency.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.TEST_WORKSPACE_ID =
  exports.TEST_PASSWORD =
  exports.TEST_ACCOUNTS =
  exports.BindingTargetType =
  exports.RecurrencePattern =
  exports.CalendarEventType =
  exports.CalendarRuleType =
  exports.CalendarScope =
  exports.PolicyTrigger =
  exports.PolicyStatus =
  exports.PolicyEffect =
  exports.PolicyScope =
  exports.OwnerEntityType =
  exports.MediaAssetStatus =
  exports.MediaType =
  exports.OrderStatus =
  exports.DeliveryStatus =
  exports.PaymentMethod =
  exports.PaymentStatus =
  exports.BusinessType =
  exports.AssetStatus =
  exports.AssetType =
  exports.VehicleType =
  exports.SignUpSessionStatus =
  exports.WalletType =
  exports.OwnerType =
  exports.WorkspaceStatus =
  exports.WorkspaceType =
  exports.RoleScope =
  exports.ActorType =
    void 0;
// ============================================================================
// Enums (Shared across modules)
// ============================================================================
var ActorType;
(function (ActorType) {
  ActorType['Rider'] = 'Rider';
  ActorType['Driver'] = 'Driver';
  ActorType['Admin'] = 'Admin';
  ActorType['Support'] = 'Support';
  ActorType['HUMAN'] = 'HUMAN';
  ActorType['SaccoAdmin'] = 'SaccoAdmin';
  ActorType['Business'] = 'Business';
  ActorType['BusinessOwner'] = 'BusinessOwner';
  ActorType['Customer'] = 'Customer';
  ActorType['Internal'] = 'Internal';
  ActorType['AIService'] = 'AIService';
})(ActorType || (exports.ActorType = ActorType = {}));
var RoleScope;
(function (RoleScope) {
  RoleScope['Global'] = 'Global';
  RoleScope['Organization'] = 'Organization';
  RoleScope['Workspace'] = 'Workspace';
})(RoleScope || (exports.RoleScope = RoleScope = {}));
var WorkspaceType;
(function (WorkspaceType) {
  WorkspaceType['Operations'] = 'Operations';
  WorkspaceType['Support'] = 'Support';
  WorkspaceType['Admin'] = 'Admin';
})(WorkspaceType || (exports.WorkspaceType = WorkspaceType = {}));
var WorkspaceStatus;
(function (WorkspaceStatus) {
  WorkspaceStatus['Active'] = 'ACTIVE';
  WorkspaceStatus['Inactive'] = 'INACTIVE';
  WorkspaceStatus['Suspended'] = 'SUSPENDED';
})(WorkspaceStatus || (exports.WorkspaceStatus = WorkspaceStatus = {}));
var OwnerType;
(function (OwnerType) {
  OwnerType['Actor'] = 'Actor';
  OwnerType['Organization'] = 'Organization';
})(OwnerType || (exports.OwnerType = OwnerType = {}));
var WalletType;
(function (WalletType) {
  WalletType['Primary'] = 'Primary';
  WalletType['Escrow'] = 'Escrow';
  WalletType['Rewards'] = 'Rewards';
})(WalletType || (exports.WalletType = WalletType = {}));
var SignUpSessionStatus;
(function (SignUpSessionStatus) {
  SignUpSessionStatus['Partial'] = 'PARTIAL';
  SignUpSessionStatus['PendingVerification'] = 'PENDING_VERIFICATION';
  SignUpSessionStatus['Completed'] = 'COMPLETED';
  SignUpSessionStatus['Expired'] = 'EXPIRED';
})(SignUpSessionStatus || (exports.SignUpSessionStatus = SignUpSessionStatus = {}));
var VehicleType;
(function (VehicleType) {
  VehicleType['Bike'] = 'Bike';
  VehicleType['Car'] = 'Car';
  VehicleType['TukTuk'] = 'TukTuk';
  VehicleType['Pickup'] = 'Pickup';
  VehicleType['Lorry'] = 'Lorry';
  VehicleType['Van'] = 'Van';
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var AssetType;
(function (AssetType) {
  AssetType['VEHICLE'] = 'VEHICLE';
  AssetType['EQUIPMENT'] = 'EQUIPMENT';
  AssetType['WAREHOUSE'] = 'WAREHOUSE';
  AssetType['OTHER'] = 'OTHER';
})(AssetType || (exports.AssetType = AssetType = {}));
var AssetStatus;
(function (AssetStatus) {
  AssetStatus['ACTIVE'] = 'ACTIVE';
  AssetStatus['MAINTENANCE'] = 'MAINTENANCE';
  AssetStatus['OUT_OF_SERVICE'] = 'OUT_OF_SERVICE';
  AssetStatus['ARCHIVED'] = 'ARCHIVED';
})(AssetStatus || (exports.AssetStatus = AssetStatus = {}));
var BusinessType;
(function (BusinessType) {
  BusinessType['Retail'] = 'Retail';
  BusinessType['Restaurant'] = 'Restaurant';
  BusinessType['Logistics'] = 'Logistics';
  BusinessType['Wholesale'] = 'Wholesale';
  BusinessType['Services'] = 'Services';
  BusinessType['Other'] = 'Other';
})(BusinessType || (exports.BusinessType = BusinessType = {}));
var PaymentStatus;
(function (PaymentStatus) {
  PaymentStatus['Pending'] = 'Pending';
  PaymentStatus['Processing'] = 'Processing';
  PaymentStatus['Succeeded'] = 'Succeeded';
  PaymentStatus['Failed'] = 'Failed';
  PaymentStatus['Cancelled'] = 'Cancelled';
  PaymentStatus['Refunded'] = 'Refunded';
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
  PaymentMethod['CARD'] = 'CARD';
  PaymentMethod['MOBILE_MONEY'] = 'MOBILE_MONEY';
  PaymentMethod['BANK_TRANSFER'] = 'BANK_TRANSFER';
  PaymentMethod['WALLET_BALANCE'] = 'WALLET_BALANCE';
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// ============================================================================
// Delivery Contracts
// ============================================================================
var DeliveryStatus;
(function (DeliveryStatus) {
  DeliveryStatus['Requested'] = 'Requested';
  DeliveryStatus['Assigned'] = 'Assigned';
  DeliveryStatus['PickedUp'] = 'PickedUp';
  DeliveryStatus['InTransit'] = 'InTransit';
  DeliveryStatus['Delivered'] = 'Delivered';
  DeliveryStatus['Cancelled'] = 'Cancelled';
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
// ============================================================================
// Test Account Definitions (Dev/Test Only)
// ============================================================================
/**
 * ============================================================================
 * Order Contracts
 * ============================================================================
 */
var OrderStatus;
(function (OrderStatus) {
  OrderStatus['Pending'] = 'Pending';
  OrderStatus['Confirmed'] = 'Confirmed';
  OrderStatus['Fulfilled'] = 'Fulfilled';
  OrderStatus['Cancelled'] = 'Cancelled';
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// ============================================================================
// Media Contracts
// ============================================================================
var MediaType;
(function (MediaType) {
  MediaType['Image'] = 'Image';
  MediaType['Video'] = 'Video';
  MediaType['Document'] = 'Document';
  MediaType['Audio'] = 'Audio';
})(MediaType || (exports.MediaType = MediaType = {}));
var MediaAssetStatus;
(function (MediaAssetStatus) {
  MediaAssetStatus['Pending'] = 'Pending';
  MediaAssetStatus['Uploading'] = 'Uploading';
  MediaAssetStatus['Active'] = 'Active';
  MediaAssetStatus['Archived'] = 'Archived';
  MediaAssetStatus['Deleted'] = 'Deleted';
})(MediaAssetStatus || (exports.MediaAssetStatus = MediaAssetStatus = {}));
var OwnerEntityType;
(function (OwnerEntityType) {
  OwnerEntityType['Rider'] = 'Rider';
  OwnerEntityType['Business'] = 'Business';
  OwnerEntityType['Delivery'] = 'Delivery';
  OwnerEntityType['Sacco'] = 'Sacco';
  OwnerEntityType['Order'] = 'Order';
  OwnerEntityType['Asset'] = 'Asset';
  OwnerEntityType['Operator'] = 'Operator';
})(OwnerEntityType || (exports.OwnerEntityType = OwnerEntityType = {}));
// ============================================================================
// Policy Contracts
// ============================================================================
/**
 * Policy Scope Enum
 * Defines the hierarchical scope levels for policies.
 * More specific scopes (RIDER) override more general scopes (GLOBAL).
 * Hierarchy: GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER
 */
var PolicyScope;
(function (PolicyScope) {
  PolicyScope['GLOBAL'] = 'GLOBAL';
  PolicyScope['NATIONAL'] = 'NATIONAL';
  PolicyScope['SACCO'] = 'SACCO';
  PolicyScope['BUSINESS'] = 'BUSINESS';
  PolicyScope['RIDER'] = 'RIDER';
  PolicyScope['ASSET'] = 'ASSET';
  PolicyScope['OPERATOR'] = 'OPERATOR';
})(PolicyScope || (exports.PolicyScope = PolicyScope = {}));
/**
 * Policy Effect Enum
 * Defines the possible outcomes when a policy matches.
 */
var PolicyEffect;
(function (PolicyEffect) {
  PolicyEffect['ALLOW'] = 'ALLOW';
  PolicyEffect['BLOCK'] = 'BLOCK';
  PolicyEffect['MODIFY'] = 'MODIFY';
  PolicyEffect['REQUIRE_APPROVAL'] = 'REQUIRE_APPROVAL';
})(PolicyEffect || (exports.PolicyEffect = PolicyEffect = {}));
/**
 * Policy Status Enum
 * Defines the lifecycle states of a policy.
 */
var PolicyStatus;
(function (PolicyStatus) {
  PolicyStatus['ACTIVE'] = 'ACTIVE';
  PolicyStatus['INACTIVE'] = 'INACTIVE';
  PolicyStatus['DRAFT'] = 'DRAFT';
  PolicyStatus['ARCHIVED'] = 'ARCHIVED';
})(PolicyStatus || (exports.PolicyStatus = PolicyStatus = {}));
/**
 * Policy Trigger Enum
 * Defines the events that can trigger policy evaluation.
 */
var PolicyTrigger;
(function (PolicyTrigger) {
  PolicyTrigger['DELIVERY_CREATION'] = 'DELIVERY_CREATION';
  PolicyTrigger['RIDER_ASSIGNMENT'] = 'RIDER_ASSIGNMENT';
  PolicyTrigger['STATUS_TRANSITION'] = 'STATUS_TRANSITION';
  PolicyTrigger['SLA_CHECK'] = 'SLA_CHECK';
  PolicyTrigger['REVENUE_DISTRIBUTION'] = 'REVENUE_DISTRIBUTION';
  PolicyTrigger['ORDER_PLACEMENT'] = 'ORDER_PLACEMENT';
})(PolicyTrigger || (exports.PolicyTrigger = PolicyTrigger = {}));
// ============================================================================
// Calendar Contracts
// ============================================================================
/**
 * Calendar Scope Enum
 * Defines the hierarchical scope levels for calendars.
 * Mirrors PolicyScope hierarchy for consistency.
 * Hierarchy: GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER
 */
var CalendarScope;
(function (CalendarScope) {
  CalendarScope['GLOBAL'] = 'GLOBAL';
  CalendarScope['NATIONAL'] = 'NATIONAL';
  CalendarScope['SACCO'] = 'SACCO';
  CalendarScope['BUSINESS'] = 'BUSINESS';
  CalendarScope['RIDER'] = 'RIDER';
  CalendarScope['ASSET'] = 'ASSET';
  CalendarScope['OPERATOR'] = 'OPERATOR';
})(CalendarScope || (exports.CalendarScope = CalendarScope = {}));
/**
 * Calendar Rule Type Enum
 * Defines the types of rules that can be applied to calendars.
 */
var CalendarRuleType;
(function (CalendarRuleType) {
  CalendarRuleType['WORKING_HOURS'] = 'WORKING_HOURS';
  CalendarRuleType['WEEKEND'] = 'WEEKEND';
  CalendarRuleType['HOLIDAY'] = 'HOLIDAY';
  CalendarRuleType['CLOSURE'] = 'CLOSURE';
  CalendarRuleType['BLACKOUT'] = 'BLACKOUT';
})(CalendarRuleType || (exports.CalendarRuleType = CalendarRuleType = {}));
/**
 * Calendar Event Type Enum
 * Defines the types of events that can be recorded in calendars.
 */
var CalendarEventType;
(function (CalendarEventType) {
  CalendarEventType['PUBLIC_HOLIDAY'] = 'PUBLIC_HOLIDAY';
  CalendarEventType['BUSINESS_CLOSURE'] = 'BUSINESS_CLOSURE';
  CalendarEventType['NATIONAL_EVENT'] = 'NATIONAL_EVENT';
  CalendarEventType['WEATHER_DISRUPTION'] = 'WEATHER_DISRUPTION';
  CalendarEventType['STRIKE_ADVISORY'] = 'STRIKE_ADVISORY';
  CalendarEventType['PROMOTIONAL_CAMPAIGN'] = 'PROMOTIONAL_CAMPAIGN';
})(CalendarEventType || (exports.CalendarEventType = CalendarEventType = {}));
/**
 * Recurrence Pattern Enum
 * Defines patterns for recurring calendar events and time windows.
 */
var RecurrencePattern;
(function (RecurrencePattern) {
  RecurrencePattern['NONE'] = 'NONE';
  RecurrencePattern['DAILY'] = 'DAILY';
  RecurrencePattern['WEEKLY'] = 'WEEKLY';
  RecurrencePattern['MONTHLY'] = 'MONTHLY';
  RecurrencePattern['YEARLY'] = 'YEARLY';
  RecurrencePattern['CUSTOM'] = 'CUSTOM';
})(RecurrencePattern || (exports.RecurrencePattern = RecurrencePattern = {}));
/**
 * Binding Target Type Enum
 * Defines the entity types that can be bound to a calendar.
 */
var BindingTargetType;
(function (BindingTargetType) {
  BindingTargetType['BUSINESS'] = 'BUSINESS';
  BindingTargetType['SACCO'] = 'SACCO';
  BindingTargetType['RIDER'] = 'RIDER';
  BindingTargetType['WORKSPACE'] = 'WORKSPACE';
  BindingTargetType['ASSET'] = 'ASSET';
  BindingTargetType['OPERATOR'] = 'OPERATOR';
})(BindingTargetType || (exports.BindingTargetType = BindingTargetType = {}));
var test_accounts_js_1 = require('./test-accounts.js');
Object.defineProperty(exports, 'TEST_ACCOUNTS', {
  enumerable: true,
  get: function () {
    return test_accounts_js_1.TEST_ACCOUNTS;
  },
});
Object.defineProperty(exports, 'TEST_PASSWORD', {
  enumerable: true,
  get: function () {
    return test_accounts_js_1.TEST_PASSWORD;
  },
});
Object.defineProperty(exports, 'TEST_WORKSPACE_ID', {
  enumerable: true,
  get: function () {
    return test_accounts_js_1.TEST_WORKSPACE_ID;
  },
});
//# sourceMappingURL=index.js.map
