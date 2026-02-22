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
          tagline: 'Reliable Moving Services',
          ctaText: 'Find Movers',
          phoneNumber: '+254 700 000 000',
          email: 'info@zanafleet.movers',
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
      type: 'root' as LayoutType,
      props: {
        padding: 0,
        backgroundColor: '#f8f9fa',
      },
      children: [
        // Hero + Form Section (styled container)
        {
          type: 'flex' as LayoutType,
          props: {
            direction: 'column',
            spacing: 3,
            padding: 6,
            align: 'stretch',
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          },
          children: [
            {
              type: 'stack' as LayoutType,
              props: {
                spacing: 3,
                maxWidth: 1200,
                padding: 0,
              },
              components: [
                {
                  component: 'Typography',
                  props: {
                    variant: 'h3',
                    color: '#FFFFFF',
                    content: 'Find Reliable Movers',
                    sx: { fontWeight: 700 },
                  },
                },
                {
                  component: 'Typography',
                  props: {
                    variant: 'h6',
                    color: '#FFFFFF',
                    content: 'Get instant quotes and book your move in minutes',
                    sx: { opacity: 0.9 },
                  },
                },
                // Form wrapper
                {
                  component: 'Form',
                  id: 'booking-form',
                  props: {
                    name: 'bookingForm',
                    sx: { mt: 1 },
                  },
                  children: [
                    // Location Inputs (responsive grid)
                    {
                      type: 'grid' as LayoutType,
                      props: { spacing: 2 },
                      components: [
                        {
                          component: 'GridItem',
                          id: 'grid-moving-from',
                          props: { xs: 12, md: 5 },
                          children: [
                            {
                              component: 'Paper',
                              id: 'paper-moving-from',
                              props: { padding: 2, backgroundColor: '#ffffff' },
                              children: [
                                {
                                  component: 'Typography',
                                  props: {
                                    variant: 'subtitle2',
                                    color: 'text.secondary',
                                    content: 'Moving From',
                                    sx: { mb: 1 },
                                  },
                                },
                                {
                                  component: 'Autocomplete',
                                  id: 'moving-from',
                                  props: {
                                    name: 'movingFrom',
                                    label: '',
                                    placeholder: 'Enter origin address',
                                    freeSolo: true,
                                    fullWidth: true,
                                    size: 'small',
                                    options: [
                                      'Nairobi',
                                      'Mombasa',
                                      'Kisumu',
                                      'Nakuru',
                                      'Eldoret',
                                      'Thika',
                                      'Malindi',
                                      'Kitale',
                                    ],
                                    required: true,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                        {
                          component: 'GridItem',
                          id: 'grid-swap',
                          props: { xs: 12, md: 2 },
                          children: [
                            {
                              component: 'Box',
                              id: 'swap-icon',
                              props: {
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                sx: {
                                  my: 2,
                                },
                              },
                              children: [
                                {
                                  component: 'Box',
                                  id: 'swap-circle',
                                  props: {
                                    width: '48px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    sx: {
                                      height: '48px',
                                      borderRadius: '50%',
                                      bgcolor: '#ffffff',
                                      color: 'primary.main',
                                      fontSize: '1.2rem',
                                    },
                                  },
                                  children: [
                                    {
                                      component: 'Typography',
                                      props: {
                                        variant: 'body1',
                                        content: '⇄',
                                      },
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          component: 'GridItem',
                          id: 'grid-moving-to',
                          props: { xs: 12, md: 5 },
                          children: [
                            {
                              component: 'Paper',
                              id: 'paper-moving-to',
                              props: { padding: 2, backgroundColor: '#ffffff' },
                              children: [
                                {
                                  component: 'Typography',
                                  props: {
                                    variant: 'subtitle2',
                                    color: 'text.secondary',
                                    content: 'Moving To',
                                    sx: { mb: 1 },
                                  },
                                },
                                {
                                  component: 'Autocomplete',
                                  id: 'moving-to',
                                  props: {
                                    name: 'movingTo',
                                    label: '',
                                    placeholder: 'Enter destination address',
                                    freeSolo: true,
                                    fullWidth: true,
                                    size: 'small',
                                    options: [
                                      'Nairobi',
                                      'Mombasa',
                                      'Kisumu',
                                      'Nakuru',
                                      'Eldoret',
                                      'Thika',
                                      'Malindi',
                                      'Kitale',
                                    ],
                                    required: true,
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    // House Size Selectors
                    {
                      type: 'grid' as LayoutType,
                      props: {
                        spacing: 3,
                        padding: 3,
                        backgroundColor: '#ffffff',
                        borderRadius: 1,
                      },
                      components: [
                        {
                          component: 'GridItem',
                          id: 'grid-current-house-size',
                          props: { xs: 12, md: 6 },
                          children: [
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
                          ],
                        },
                        {
                          component: 'GridItem',
                          id: 'grid-destination-house-size',
                          props: { xs: 12, md: 6 },
                          children: [
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
                      ],
                    },
                    // CTA Button
                    {
                      component: 'Button',
                      id: 'find-movers-btn',
                      props: {
                        variant: 'contained',
                        size: 'large',
                        content: '{{config.ctaText}}',
                        type: 'submit',
                        sx: {
                          bgcolor: '#ffffff',
                          color: 'primary.main',
                          px: 6,
                          py: 1.5,
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          '&:hover': { bgcolor: 'grey.100' },
                        },
                      },
                    },
                  ],
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
        label: 'Find Movers',
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
