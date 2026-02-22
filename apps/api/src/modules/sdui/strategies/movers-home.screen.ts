/**
 * Movers Homepage Screen Strategy
 *
 * Schema definition for the movers booking form.
 */

import {
  UISchema,
  SDUIRequest,
  SDUIActionRequest,
  SDUIActionResponse,
  ScreenMetadata,
  ScreenType,
  AuthRequirement,
  LayoutNode,
  LayoutType,
  DataSource,
  ActionDefinition,
  ActionType,
  ValidationRule,
} from '../interfaces';
import { ScreenRenderer, SDUIService } from '../services/sdui.service';

/**
 * Movers Homepage Screen Schema
 *
 * Server-driven UI schema for movers/transportation booking form.
 */
export class MoversHomeScreenStrategy implements ScreenRenderer {
  private readonly sduiService: SDUIService;

  constructor(sduiService: SDUIService) {
    this.sduiService = sduiService;
  }

  /**
   * Render the movers booking form schema
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async render(_request: SDUIRequest): Promise<UISchema> {
    const metadata: ScreenMetadata = {
      title: 'Find Reliable Movers',
      description: 'Get instant quotes and book your move in minutes',
      type: 'movers-home' as ScreenType,
      auth: 'none' as AuthRequirement,
      cacheDuration: 300,
      offlineCapable: false,
    };

    // Static data sources for the form
    const dataSources: DataSource[] = [
      {
        id: 'config',
        type: 'static',
        endpoint: '/api/sdui/screens/movers-home/config',
        staticData: {
          companyName: 'ZanaFleet Movers',
          tagline: 'Professional Moving Services',
        },
        cacheable: true,
        cacheDuration: 3600,
      },
      {
        id: 'houseSizes',
        type: 'static',
        endpoint: '/api/sdui/screens/movers-home/house-sizes',
        staticData: [
          { value: 'studio', label: 'Studio', icon: '🏢' },
          { value: '1br', label: '1 Bedroom', icon: '🏠' },
          { value: '2br', label: '2 Bedrooms', icon: '🏡' },
          { value: '3br', label: '3 Bedrooms', icon: '🏘️' },
          { value: '4br+', label: '4+ Bedrooms', icon: '🏚️' },
        ],
        cacheable: true,
        cacheDuration: 3600,
      },
    ];

    // Validation rules for form fields
    const validations: ValidationRule[] = [
      {
        field: 'movingFrom',
        type: 'required',
        message: 'Please enter your moving from address',
      },
      {
        field: 'movingTo',
        type: 'required',
        message: 'Please enter your destination address',
      },
      {
        field: 'currentHouseSize',
        type: 'required',
        message: 'Please select your current home size',
      },
      {
        field: 'destinationHouseSize',
        type: 'required',
        message: 'Please select your destination home size',
      },
    ];

    const layout: LayoutNode = {
      type: 'flex' as LayoutType,
      props: {
        direction: 'column',
        spacing: 0,
      },
      children: [
        // Hero/Header Section
        {
          type: 'flex' as LayoutType,
          props: {
            direction: 'column',
            align: 'center',
            justify: 'center',
            padding: 6,
            backgroundColor: '#1976d2',
          },
          components: [
            {
              component: 'Typography',
              props: {
                variant: 'h3',
                color: '#FFFFFF',
                align: 'center',
                content: 'Find Reliable Movers',
              },
            },
            {
              component: 'Typography',
              props: {
                variant: 'h6',
                color: '#FFFFFF',
                align: 'center',
                content: 'Get instant quotes and book your move in minutes',
              },
            },
          ],
        },
        // Booking Form Section
        {
          type: 'flex' as LayoutType,
          props: {
            direction: 'column',
            padding: 4,
            spacing: 3,
          },
          components: [
            // Form wrapper
            {
              component: 'Form',
              id: 'booking-form',
              props: {
                name: 'bookingForm',
              },
              children: [
                // Address Search Section
                {
                  type: 'flex' as LayoutType,
                  props: {
                    direction: 'row',
                    spacing: 2,
                    align: 'center',
                  },
                  components: [
                    // Moving From Autocomplete
                    {
                      component: 'Autocomplete',
                      id: 'moving-from',
                      props: {
                        name: 'movingFrom',
                        label: 'Moving From',
                        placeholder: 'Enter origin address',
                        freeSolo: true,
                        options: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale'],
                        required: true,
                      },
                    },
                    // Swap Icon placeholder (just empty space for now)
                    {
                      component: 'Box',
                      props: {
                        width: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    },
                    // Moving To Autocomplete
                    {
                      component: 'Autocomplete',
                      id: 'moving-to',
                      props: {
                        name: 'movingTo',
                        label: 'Moving To',
                        placeholder: 'Enter destination address',
                        freeSolo: true,
                        options: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale'],
                        required: true,
                      },
                    },
                  ],
                },
                // House Size Section
                {
                  type: 'flex' as LayoutType,
                  props: {
                    direction: 'row',
                    spacing: 3,
                  },
                  components: [
                    // Current House Size
                    {
                      component: 'ToggleButtonGroup',
                      id: 'current-house-size',
                      props: {
                        name: 'currentHouseSize',
                        label: 'Current Home Size',
                        fullWidth: true,
                        size: 'small',
                        options: [
                          { value: 'studio', label: 'Studio', icon: '🏢' },
                          { value: '1br', label: '1 Bedroom', icon: '🏠' },
                          { value: '2br', label: '2 Bedrooms', icon: '🏡' },
                          { value: '3br', label: '3 Bedrooms', icon: '🏘️' },
                          { value: '4br+', label: '4+ Bedrooms', icon: '🏚️' },
                        ],
                        required: true,
                      },
                    },
                    // Destination House Size
                    {
                      component: 'ToggleButtonGroup',
                      id: 'destination-house-size',
                      props: {
                        name: 'destinationHouseSize',
                        label: 'Destination Home Size',
                        fullWidth: true,
                        size: 'small',
                        options: [
                          { value: 'studio', label: 'Studio', icon: '🏢' },
                          { value: '1br', label: '1 Bedroom', icon: '🏠' },
                          { value: '2br', label: '2 Bedrooms', icon: '🏡' },
                          { value: '3br', label: '3 Bedrooms', icon: '🏘️' },
                          { value: '4br+', label: '4+ Bedrooms', icon: '🏚️' },
                        ],
                        required: true,
                      },
                    },
                  ],
                },
                // Submit Button
                {
                  component: 'Button',
                  id: 'find-movers-btn',
                  props: {
                    variant: 'contained',
                    color: 'primary',
                    size: 'large',
                    content: 'Find Movers',
                    type: 'submit',
                    fullWidth: false,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const actions: ActionDefinition[] = [
      {
        id: 'submit-quote-request',
        type: 'submit' as ActionType,
        label: 'Get Quote',
        navigateTo: 'quote',
      },
      {
        id: 'navigate-to-login',
        type: 'navigate' as ActionType,
        label: 'Login',
        navigateTo: 'login',
      },
    ];

    return {
      version: '1.0.0',
      screenId: 'movers-home',
      metadata,
      data: dataSources,
      layout,
      actions,
      validations,
    };
  }

  /**
   * Execute an action on this screen
   */
  async executeAction(request: SDUIActionRequest): Promise<SDUIActionResponse> {
    const { actionId, payload } = request;

    switch (actionId) {
      case 'submit-quote-request': {
        // In a real implementation, this would call a quote service
        // For now, we return mock quote data to demonstrate the flow
        const mockQuote = {
          quoteId: 'QT-' + Date.now(),
          vehicles: [
            {
              vehicleType: 'small-truck',
              vehicleName: 'Small Truck',
              capacity: '1-1.5 tons',
              recommendedFor: ['studio', '1br'],
              estimatedCapacityCubicMeters: 10,
            },
            {
              vehicleType: 'medium-truck',
              vehicleName: 'Medium Truck',
              capacity: '2-3 tons',
              recommendedFor: ['2br', '3br'],
              estimatedCapacityCubicMeters: 20,
            },
          ],
          estimatedPrice: { min: 5000, max: 15000, currency: 'KES' },
          estimatedDuration: { minMinutes: 60, maxMinutes: 180 },
          distanceKilometers: 25.5,
          availableSlots: [
            { date: new Date(Date.now() + 86400000).toISOString(), startTime: '08:00', endTime: '10:00', available: true },
            { date: new Date(Date.now() + 86400000).toISOString(), startTime: '10:00', endTime: '12:00', available: true },
            { date: new Date(Date.now() + 86400000).toISOString(), startTime: '14:00', endTime: '16:00', available: true },
          ],
          pricingFactors: [
            { name: 'Distance', impact: 'positive' as const, description: 'Based on distance traveled' },
            { name: 'Fuel Costs', impact: 'positive' as const, description: 'Current fuel prices' },
            { name: 'Loading Assistance', impact: 'neutral' as const, description: 'Optional helper available' },
          ],
          validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        };

        return {
          success: true,
          data: {
            quote: mockQuote,
          },
          message: 'Quote calculated successfully',
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${actionId}`,
        };
    }
  }
}