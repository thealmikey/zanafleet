import { Injectable } from '@nestjs/common';

import { AbstractStateRenderer } from './state-renderer.base';
import { ComponentRegistryService } from '../services/component-registry.service';
import {
  UIComponent,
  UIActionDefinition,
  ScreenConfig,
} from '../interfaces/ui-composer.interfaces';

/**
 * MoveBookingStateRenderer
 *
 * Renders UI for the MoveBooking process.
 * Handles states: DRAFT → ESTIMATE_REQUESTED → OPTIONS_PRESENTED → BOOKING_CONFIRMED → DRIVER_ASSIGNED → IN_PROGRESS → COMPLETED
 *
 * Architecture Boundaries:
 * - This renderer ONLY declares what UI to show
 * - It does NOT enforce business rules
 * - It does NOT validate state transitions
 * - It does NOT check capabilities (done in UIComposer service)
 * - All capability checking happens AFTER rendering in UIComposer
 */
@Injectable()
export class MoveBookingStateRenderer extends AbstractStateRenderer {
  readonly contextType = 'MOVE_BOOKING';

  constructor(componentRegistry: ComponentRegistryService) {
    super(componentRegistry);
  }

  /**
   * Get components for a specific state
   */
  protected getComponentsForState(state: string, context: Record<string, unknown>): UIComponent[] {
    const components: UIComponent[] = [];

    switch (state) {
      case 'draft':
        components.push(...this.getDraftComponents(context));
        break;

      case 'estimate_requested':
        components.push(...this.getEstimateRequestedComponents(context));
        break;

      case 'options_presented':
        components.push(...this.getOptionsPresentedComponents(context));
        break;

      case 'booking_confirmed':
      case 'payment_authorized':
        components.push(...this.getBookingConfirmedComponents(context));
        break;

      case 'driver_assigned':
        components.push(...this.getDriverAssignedComponents(context));
        break;

      case 'in_progress':
      case 'arrived':
      case 'loading':
      case 'unloading':
        components.push(...this.getInProgressComponents(context));
        break;

      case 'completed':
        components.push(...this.getCompletedComponents(context));
        break;

      case 'cancelled':
        components.push(...this.getCancelledComponents(context));
        break;

      default:
        this.debug(`Unknown state: ${state}, returning default components`);
        components.push(...this.getDefaultComponents(context));
    }

    return components;
  }

  /**
   * Get actions for a specific state
   */
  protected getActionsForState(
    state: string,
    context: Record<string, unknown>
  ): UIActionDefinition[] {
    const actions: UIActionDefinition[] = [];

    switch (state) {
      case 'draft':
        actions.push(...this.getDraftActions(context));
        break;

      case 'estimate_requested':
        actions.push(...this.getEstimateRequestedActions(context));
        break;

      case 'options_presented':
        actions.push(...this.getOptionsPresentedActions(context));
        break;

      case 'booking_confirmed':
      case 'payment_authorized':
        actions.push(...this.getBookingConfirmedActions(context));
        break;

      case 'driver_assigned':
        actions.push(...this.getDriverAssignedActions(context));
        break;

      case 'in_progress':
      case 'arrived':
      case 'loading':
      case 'unloading':
        actions.push(...this.getInProgressActions(context));
        break;

      case 'completed':
        actions.push(...this.getCompletedActions(context));
        break;

      default:
        this.debug(`Unknown state: ${state}, returning empty actions`);
    }

    return actions;
  }

  /**
   * Get screen configuration for the state
   */
  protected getScreenConfiguration(state: string): ScreenConfig {
    const screenConfigs: Record<string, ScreenConfig> = {
      draft: {
        screen: 'move-booking-create',
        title: 'Create Move Booking',
        subtitle: 'Enter your moving details',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'New Booking', isCurrent: true },
        ],
      },
      estimate_requested: {
        screen: 'move-booking-estimating',
        title: 'Getting Quote',
        subtitle: 'We are calculating your moving quote',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Booking', href: '/bookings' },
          { label: 'Getting Quote', isCurrent: true },
        ],
      },
      options_presented: {
        screen: 'move-booking-options',
        title: 'Choose Your Option',
        subtitle: 'Select from available moving options',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Booking', href: '/bookings' },
          { label: 'Options', isCurrent: true },
        ],
      },
      booking_confirmed: {
        screen: 'move-booking-confirmed',
        title: 'Booking Confirmed',
        subtitle: 'Your move has been scheduled',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Confirmed', isCurrent: true },
        ],
      },
      payment_authorized: {
        screen: 'move-booking-payment',
        title: 'Payment Confirmed',
        subtitle: 'Payment has been processed',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Payment', isCurrent: true },
        ],
      },
      driver_assigned: {
        screen: 'move-booking-driver-assigned',
        title: 'Driver Assigned',
        subtitle: 'Your driver is on the way',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Driver Assigned', isCurrent: true },
        ],
      },
      in_progress: {
        screen: 'move-booking-active',
        title: 'Move In Progress',
        subtitle: 'Your move is underway',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'In Progress', isCurrent: true },
        ],
      },
      arrived: {
        screen: 'move-booking-arrived',
        title: 'Driver Arrived',
        subtitle: 'Your driver has arrived',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Arrived', isCurrent: true },
        ],
      },
      loading: {
        screen: 'move-booking-loading',
        title: 'Loading Items',
        subtitle: 'Items are being loaded',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Loading', isCurrent: true },
        ],
      },
      unloading: {
        screen: 'move-booking-unloading',
        title: 'Unloading Items',
        subtitle: 'Items are being unloaded',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Unloading', isCurrent: true },
        ],
      },
      completed: {
        screen: 'move-booking-completed',
        title: 'Move Completed',
        subtitle: 'Thank you for using ZanaFleet',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Completed', isCurrent: true },
        ],
      },
      cancelled: {
        screen: 'move-booking-cancelled',
        title: 'Booking Cancelled',
        subtitle: 'This booking has been cancelled',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'My Bookings', href: '/bookings' },
          { label: 'Cancelled', isCurrent: true },
        ],
      },
    };

    return (
      screenConfigs[state] ?? {
        screen: 'move-booking-unknown',
        title: 'Booking',
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Booking', isCurrent: true },
        ],
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Component Builders by State
  // ---------------------------------------------------------------------------

  private getDraftComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('BookingDetails', {
        title: 'New Move Booking',
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
      }),
      this.componentRegistry.createComponent('ItemList', {
        items: context.items ?? [],
        editable: true,
      }),
      this.componentRegistry.createComponent('SchedulePicker', {
        selectedDate: context.scheduledDate,
        minDate: new Date().toISOString(),
      }),
      this.componentRegistry.createComponent('LocationPicker', {
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
      }),
    ];
  }

  private getEstimateRequestedComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('BookingSummary', {
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        status: 'estimating',
      }),
      this.componentRegistry.createComponent('ProgressBar', {
        currentStep: 1,
        totalSteps: 5,
        labels: ['Details', 'Quote', 'Confirm', 'Assign', 'Move'],
      }),
      this.componentRegistry.createComponent('CountdownTimer', {
        targetTime: context.quoteExpiryTime,
        label: 'Quote expires in',
      }),
    ];
  }

  private getOptionsPresentedComponents(context: Record<string, unknown>): UIComponent[] {
    const options = (context.quoteOptions ?? []) as Array<Record<string, unknown>>;

    return [
      this.componentRegistry.createComponent('QuoteCard', {
        quotes: options,
        selectedQuoteId: context.selectedQuoteId,
      }),
      this.componentRegistry.createComponent('PriceEstimate', {
        options: options,
        showRange: true,
      }),
      this.componentRegistry.createComponent('RouteDisplay', {
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        distance: context.distance,
        duration: context.estimatedDuration,
      }),
    ];
  }

  private getBookingConfirmedComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('BookingSummary', {
        bookingId: context.bookingId,
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        scheduledDate: context.scheduledDate,
        status: 'confirmed',
      }),
      this.componentRegistry.createComponent('PaymentSummary', {
        amount: context.totalPrice,
        paymentMethod: context.paymentMethod,
        status: context.paymentStatus,
      }),
      this.componentRegistry.createComponent('SchedulePicker', {
        selectedDate: context.scheduledDate,
        readonly: true,
      }),
    ];
  }

  private getDriverAssignedComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('DriverCard', {
        driverId: context.driverId,
        driverName: context.driverName,
        driverPhoto: context.driverPhoto,
        rating: context.driverRating,
        vehicleInfo: context.vehicleInfo,
        phoneNumber: context.driverPhone,
        showRating: true,
        showContact: true,
        showVehicle: true,
      }),
      this.componentRegistry.createComponent('LiveMap', {
        driverId: context.driverId,
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        driverLocation: context.driverLocation,
        showRoute: true,
        showDriver: true,
        autoRefresh: true,
      }),
      this.componentRegistry.createComponent('BookingSummary', {
        bookingId: context.bookingId,
        scheduledDate: context.scheduledDate,
        status: 'driver_assigned',
      }),
      this.componentRegistry.createComponent('TimeWindow', {
        scheduledTime: context.scheduledTime,
        arrivalEstimate: context.estimatedArrival,
      }),
    ];
  }

  private getInProgressComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('LiveMap', {
        driverId: context.driverId,
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        driverLocation: context.driverLocation,
        showRoute: true,
        showDriver: true,
        showPickup: true,
        showDropoff: true,
        autoRefresh: true,
      }),
      this.componentRegistry.createComponent('StatusTimeline', {
        currentState: context.currentState,
        history: context.history ?? [],
        showIcons: true,
        showTimestamps: true,
      }),
      this.componentRegistry.createComponent('DriverCard', {
        driverId: context.driverId,
        driverName: context.driverName,
        driverPhoto: context.driverPhoto,
        rating: context.driverRating,
        phoneNumber: context.driverPhone,
      }),
      this.componentRegistry.createComponent('ItemList', {
        items: context.items ?? [],
        status: 'in_transit',
        showStatus: true,
      }),
    ];
  }

  private getCompletedComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('StatusTimeline', {
        currentState: 'completed',
        history: context.history ?? [],
        showIcons: true,
        showTimestamps: true,
      }),
      this.componentRegistry.createComponent('BookingSummary', {
        bookingId: context.bookingId,
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        status: 'completed',
        completedAt: context.completedAt,
      }),
      this.componentRegistry.createComponent('PaymentSummary', {
        amount: context.totalPrice,
        paymentMethod: context.paymentMethod,
        status: 'completed',
      }),
      this.componentRegistry.createComponent('RatingInput', {
        bookingId: context.bookingId,
        maxStars: 5,
      }),
      this.componentRegistry.createComponent('ReviewForm', {
        bookingId: context.bookingId,
      }),
    ];
  }

  private getCancelledComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('StatusBadge', {
        status: 'cancelled',
        label: 'Cancelled',
      }),
      this.componentRegistry.createComponent('BookingSummary', {
        bookingId: context.bookingId,
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
        status: 'cancelled',
        cancelledAt: context.cancelledAt,
        cancellationReason: context.cancellationReason,
      }),
    ];
  }

  private getDefaultComponents(context: Record<string, unknown>): UIComponent[] {
    return [
      this.componentRegistry.createComponent('BookingSummary', {
        bookingId: context.bookingId,
        items: context.items ?? [],
        pickupAddress: context.pickupAddress,
        dropoffAddress: context.dropoffAddress,
      }),
    ];
  }

  // ---------------------------------------------------------------------------
  // Action Builders by State
  // ---------------------------------------------------------------------------

  private getDraftActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'request-quote',
        label: 'Get Quote',
        capability: 'move:quote:request',
        requiresConfirmation: false,
        style: 'primary',
      },
      {
        id: 'save-draft',
        label: 'Save Draft',
        capability: 'move:draft:save',
        requiresConfirmation: false,
        style: 'secondary',
      },
    ];
  }

  private getEstimateRequestedActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'refresh-quote',
        label: 'Refresh Quote',
        capability: 'move:quote:refresh',
        requiresConfirmation: false,
        style: 'secondary',
      },
      {
        id: 'cancel-request',
        label: 'Cancel',
        capability: 'move:quote:cancel',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to cancel this quote request?',
        style: 'danger',
      },
    ];
  }

  private getOptionsPresentedActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'select-option',
        label: 'Select Option',
        capability: 'move:option:select',
        requiresConfirmation: false,
        style: 'primary',
        availableInStates: ['options_presented'],
      },
      {
        id: 'request-new-quote',
        label: 'Get New Quote',
        capability: 'move:quote:request',
        requiresConfirmation: false,
        style: 'secondary',
      },
    ];
  }

  private getBookingConfirmedActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'add-payment',
        label: 'Add Payment',
        capability: 'move:payment:add',
        requiresConfirmation: false,
        style: 'primary',
        notAvailableInStates: ['payment_authorized'],
      },
      {
        id: 'modify-booking',
        label: 'Modify Booking',
        capability: 'move:booking:modify',
        requiresConfirmation: false,
        style: 'secondary',
      },
      {
        id: 'cancel-booking',
        label: 'Cancel Booking',
        capability: 'move:booking:cancel',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to cancel this booking?',
        style: 'danger',
      },
    ];
  }

  private getDriverAssignedActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'contact-driver',
        label: 'Contact Driver',
        capability: 'move:driver:contact',
        requiresConfirmation: false,
        style: 'secondary',
      },
      {
        id: 'view-driver',
        label: 'View Driver Details',
        capability: 'move:driver:view',
        requiresConfirmation: false,
        style: 'ghost',
      },
      {
        id: 'cancel-booking',
        label: 'Cancel Booking',
        capability: 'move:booking:cancel',
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to cancel this booking?',
        style: 'danger',
        notAvailableInStates: ['in_progress', 'arrived', 'loading', 'unloading'],
      },
    ];
  }

  private getInProgressActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'contact-driver',
        label: 'Contact Driver',
        capability: 'move:driver:contact',
        requiresConfirmation: false,
        style: 'secondary',
      },
      {
        id: 'track-live',
        label: 'Track Live',
        capability: 'move:tracking:view',
        requiresConfirmation: false,
        style: 'primary',
      },
      {
        id: 'report-issue',
        label: 'Report Issue',
        capability: 'move:issue:report',
        requiresConfirmation: false,
        style: 'danger',
      },
    ];
  }

  private getCompletedActions(_context: Record<string, unknown>): UIActionDefinition[] {
    return [
      {
        id: 'rate-driver',
        label: 'Rate Driver',
        capability: 'move:driver:rate',
        requiresConfirmation: false,
        style: 'primary',
      },
      {
        id: 'leave-review',
        label: 'Leave Review',
        capability: 'move:review:create',
        requiresConfirmation: false,
        style: 'secondary',
      },
      {
        id: 'book-again',
        label: 'Book Again',
        capability: 'move:booking:create',
        requiresConfirmation: false,
        style: 'primary',
      },
      {
        id: 'download-receipt',
        label: 'Download Receipt',
        capability: 'move:receipt:download',
        requiresConfirmation: false,
        style: 'ghost',
      },
    ];
  }
}
