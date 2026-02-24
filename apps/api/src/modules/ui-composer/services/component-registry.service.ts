import { Injectable, Logger } from '@nestjs/common';

import {
  ComponentDefinition,
  RegisteredComponents,
  UIComponent,
} from '../interfaces/ui-composer.interfaces';

/**
 * ComponentRegistryService
 *
 * Registry for UI components that can be composed.
 * Provides predefined component types and their configurations.
 *
 * Architecture Boundaries:
 * - This service only REGISTERS component definitions
 * - It does NOT render components
 * - It does NOT have business logic
 * - It is purely a configuration lookup service
 */
@Injectable()
export class ComponentRegistryService {
  private readonly logger = new Logger(ComponentRegistryService.name);
  private readonly components: RegisteredComponents = {};

  constructor() {
    this.registerDefaultComponents();
  }

  /**
   * Register the default component library
   */
  private registerDefaultComponents(): void {
    // -----------------------------------------------------------------------
    // Driver Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'DriverCard',
      displayName: 'Driver Card',
      description: 'Display driver information including name, photo, rating, and contact',
      defaultProps: {
        showRating: true,
        showContact: true,
        showVehicle: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'DriverList',
      displayName: 'Driver List',
      description: 'List of available or assigned drivers',
      defaultProps: {
        maxItems: 5,
        showAvailability: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Map Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'LiveMap',
      displayName: 'Live Map',
      description: 'Real-time map showing driver location and route',
      defaultProps: {
        showRoute: true,
        showDriver: true,
        showPickup: true,
        showDropoff: true,
        autoRefresh: true,
        refreshInterval: 5000,
      },
      requiresContext: true,
    });

    this.register({
      type: 'StaticMap',
      displayName: 'Static Map',
      description: 'Static map image showing locations',
      defaultProps: {
        width: 600,
        height: 400,
        zoom: 14,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Status Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'StatusTimeline',
      displayName: 'Status Timeline',
      description: 'Visual timeline showing process progress',
      defaultProps: {
        orientation: 'vertical',
        showIcons: true,
        showTimestamps: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'StatusBadge',
      displayName: 'Status Badge',
      description: 'Badge showing current status',
      defaultProps: {
        size: 'medium',
      },
      requiresContext: true,
    });

    this.register({
      type: 'ProgressBar',
      displayName: 'Progress Bar',
      description: 'Progress indicator for multi-step processes',
      defaultProps: {
        showPercentage: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Booking Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'BookingSummary',
      displayName: 'Booking Summary',
      description: 'Summary of booking details',
      defaultProps: {
        showItems: true,
        showPricing: true,
        showSchedule: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'BookingDetails',
      displayName: 'Booking Details',
      description: 'Detailed booking information',
      defaultProps: {
        expandable: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'QuoteCard',
      displayName: 'Quote Card',
      description: 'Price quote display',
      defaultProps: {
        showBreakdown: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Location Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'AddressInput',
      displayName: 'Address Input',
      description: 'Address input with autocomplete',
      defaultProps: {
        showMap: false,
      },
      requiresContext: false,
    });

    this.register({
      type: 'LocationPicker',
      displayName: 'Location Picker',
      description: 'Interactive map for selecting locations',
      defaultProps: {
        showCurrentLocation: true,
      },
      requiresContext: false,
    });

    this.register({
      type: 'RouteDisplay',
      displayName: 'Route Display',
      description: 'Display pickup and dropoff locations',
      defaultProps: {
        showDistance: true,
        showDuration: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Payment Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'PaymentSummary',
      displayName: 'Payment Summary',
      description: 'Payment breakdown and totals',
      defaultProps: {
        showTax: true,
        showTip: false,
        showDiscount: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'PaymentMethodSelector',
      displayName: 'Payment Method Selector',
      description: 'Select payment method',
      defaultProps: {
        showCards: true,
        showWallet: true,
      },
      requiresContext: false,
    });

    this.register({
      type: 'PriceEstimate',
      displayName: 'Price Estimate',
      description: 'Estimated price display',
      defaultProps: {
        showRange: true,
      },
      requiresContext: true,
    });

    // ---------------------------------------------------------------------------    // Action Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'ActionButtonGroup',
      displayName: 'Action Button Group',
      description: 'Group of action buttons',
      defaultProps: {
        layout: 'horizontal',
      },
      requiresContext: false,
    });

    this.register({
      type: 'ConfirmDialog',
      displayName: 'Confirm Dialog',
      description: 'Confirmation dialog',
      defaultProps: {
        title: 'Confirm Action',
      },
      requiresContext: false,
    });

    // -----------------------------------------------------------------------
    // Item Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'ItemList',
      displayName: 'Item List',
      description: 'List of items being moved',
      defaultProps: {
        showImages: true,
        showQuantity: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'ItemCard',
      displayName: 'Item Card',
      description: 'Single item display',
      defaultProps: {
        showImage: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Feedback Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'RatingInput',
      displayName: 'Rating Input',
      description: 'Star rating input',
      defaultProps: {
        maxStars: 5,
      },
      requiresContext: false,
    });

    this.register({
      type: 'ReviewForm',
      displayName: 'Review Form',
      description: 'Form for submitting reviews',
      defaultProps: {
        showRating: true,
        showComment: true,
      },
      requiresContext: false,
    });

    // -----------------------------------------------------------------------
    // Time Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'SchedulePicker',
      displayName: 'Schedule Picker',
      description: 'Date and time picker for scheduling',
      defaultProps: {
        showDate: true,
        showTime: true,
      },
      requiresContext: false,
    });

    this.register({
      type: 'TimeWindow',
      displayName: 'Time Window',
      description: 'Display time window',
      defaultProps: {
        showDuration: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'CountdownTimer',
      displayName: 'Countdown Timer',
      description: 'Countdown to a specific time',
      defaultProps: {
        showDays: true,
        showHours: true,
        showMinutes: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Document Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'DocumentUpload',
      displayName: 'Document Upload',
      description: 'Upload documents',
      defaultProps: {
        allowedTypes: [],
        maxSize: 10485760, // 10MB
      },
      requiresContext: false,
    });

    this.register({
      type: 'DocumentList',
      displayName: 'Document List',
      description: 'List of uploaded documents',
      defaultProps: {
        showDownload: true,
      },
      requiresContext: true,
    });

    // -----------------------------------------------------------------------
    // Communication Components
    // -----------------------------------------------------------------------

    this.register({
      type: 'ChatInterface',
      displayName: 'Chat Interface',
      description: 'In-app messaging',
      defaultProps: {
        showTimestamps: true,
      },
      requiresContext: true,
    });

    this.register({
      type: 'NotificationList',
      displayName: 'Notification List',
      description: 'List of notifications',
      defaultProps: {
        maxItems: 10,
      },
      requiresContext: false,
    });

    this.logger.log(
      `ComponentRegistry initialized with ${Object.keys(this.components).length} components`
    );
  }

  /**
   * Register a component
   *
   * @param definition - Component definition
   */
  register(definition: ComponentDefinition): void {
    this.components[definition.type] = definition;
    this.logger.debug(`Registered component: ${definition.type}`);
  }

  /**
   * Get a component by type
   *
   * @param type - Component type
   * @returns Component definition or undefined
   */
  getComponent(type: string): ComponentDefinition | undefined {
    return this.components[type];
  }

  /**
   * Check if a component type is registered
   *
   * @param type - Component type
   * @returns True if registered
   */
  hasComponent(type: string): boolean {
    return type in this.components;
  }

  /**
   * Get all registered components
   *
   * @returns All component definitions
   */
  getAllComponents(): ComponentDefinition[] {
    return Object.values(this.components);
  }

  /**
   * Get components by category
   *
   * @param category - Category to filter by
   * @returns Components in the category
   */
  getComponentsByCategory(category: string): ComponentDefinition[] {
    // Categories are embedded in the type prefix (e.g., "DriverCard" -> "Driver")
    return Object.values(this.components).filter((component) =>
      component.type.toLowerCase().startsWith(category.toLowerCase())
    );
  }

  /**
   * Create a UI component instance
   *
   * @param type - Component type
   * @param props - Component props
   * @param overrides - Optional overrides
   * @returns UIComponent instance
   */
  createComponent(
    type: string,
    props: Record<string, unknown>,
    overrides?: Partial<UIComponent>
  ): UIComponent {
    const definition = this.getComponent(type);

    if (!definition) {
      this.logger.warn(`Component type not found: ${type}, using raw type`);
    }

    return {
      type: definition?.type ?? type,
      props: {
        ...definition?.defaultProps,
        ...props,
      },
      ...overrides,
    };
  }

  /**
   * Create multiple UI component instances
   *
   * @param specs - Array of component specifications
   * @returns Array of UIComponent instances
   */
  createComponents(
    specs: Array<{
      type: string;
      props?: Record<string, unknown>;
      overrides?: Partial<UIComponent>;
    }>
  ): UIComponent[] {
    return specs.map((spec) => this.createComponent(spec.type, spec.props ?? {}, spec.overrides));
  }
}
