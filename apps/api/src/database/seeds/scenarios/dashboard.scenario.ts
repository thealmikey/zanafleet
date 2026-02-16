/**
 * Dashboard Scenario Seed
 *
 * Comprehensive seed data for testing role-based dashboards and SDUI screens.
 * Includes actors (driver, dispatcher, admin), personas, capabilities, and workflow instances.
 */


import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ProcessState } from '@api/modules/workflow/entities/process-definition.entity';
import { ProcessInstanceStatus } from '@api/modules/workflow/entities/process-instance.entity';

import { InMemoryStoreFactoryService } from '../../../core/sandbox/in-memory-store.factory';

interface SeedScenario {
  name: string;
  description: string;
  load: () => Promise<void>;
}

// Actor IDs
const ACTOR_DISPATCHER_ID = 'actor-dispatcher-001';
const ACTOR_DRIVER_ID = 'actor-driver-001';
const ACTOR_ADMIN_ID = 'actor-admin-001';

// Persona IDs
const PERSONA_DISPATCHER_ID = 'persona-dispatcher';
const PERSONA_DRIVER_ID = 'persona-driver';
const PERSONA_ADMIN_ID = 'persona-admin';

// Capability IDs
const CAP_BOOKING_CREATE_ID = 'cap-booking-create';
const CAP_BOOKING_VIEW_ID = 'cap-booking-view';
const CAP_BOOKING_ASSIGN_ID = 'cap-booking-assign';
const CAP_BOOKING_CANCEL_ID = 'cap-booking-cancel';
const CAP_DRIVER_VIEW_ID = 'cap-driver-view';
const CAP_DRIVER_ASSIGN_ID = 'cap-driver-assign';
const CAP_REPORT_VIEW_ID = 'cap-report-view';
const CAP_ADMIN_ALL_ID = 'cap-admin-all';

// Process Definition IDs
const PROCESS_MOVE_BOOKING_ID = 'proc-move-booking';

/**
 * Create dashboard scenario seed
 */
export function createDashboardScenario(storeFactory: InMemoryStoreFactoryService): SeedScenario {
  return {
    name: 'dashboard',
    description: 'Comprehensive scenario with actors, personas, and workflow instances for dashboard testing',
    load: async () => {
      // =========================================================================
      // 1. SEED CAPABILITIES
      // =========================================================================
      const capabilityStore = storeFactory.getStore('Capability');

      const capabilities = [
        {
          id: CAP_BOOKING_CREATE_ID,
          name: 'move:booking:create',
          description: 'Create new bookings',
          category: 'booking',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_BOOKING_VIEW_ID,
          name: 'move:booking:view',
          description: 'View booking details',
          category: 'booking',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_BOOKING_ASSIGN_ID,
          name: 'move:booking:assign',
          description: 'Assign bookings to drivers',
          category: 'booking',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_BOOKING_CANCEL_ID,
          name: 'move:booking:cancel',
          description: 'Cancel bookings',
          category: 'booking',
          requiresConsent: true,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_DRIVER_VIEW_ID,
          name: 'move:driver:view',
          description: 'View driver information',
          category: 'driver',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_DRIVER_ASSIGN_ID,
          name: 'move:driver:assign',
          description: 'Assign drivers to bookings',
          category: 'driver',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_REPORT_VIEW_ID,
          name: 'analytics:report:view',
          description: 'View analytics reports',
          category: 'analytics',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: CAP_ADMIN_ALL_ID,
          name: 'admin:*',
          description: 'Full admin access',
          category: 'admin',
          requiresConsent: false,
          version: '1.0.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const cap of capabilities) {
        await capabilityStore.save(cap);
      }

      // =========================================================================
      // 2. SEED PERSONAS
      // =========================================================================
      const personaStore = storeFactory.getStore('Persona');

      const personas = [
        {
          id: PERSONA_DISPATCHER_ID,
          name: 'Dispatcher',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: PERSONA_DRIVER_ID,
          name: 'Driver',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: PERSONA_ADMIN_ID,
          name: 'Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const persona of personas) {
        await personaStore.save(persona);
      }

      // =========================================================================
      // 3. SEED ACTORS
      // =========================================================================
      const actorStore = storeFactory.getStore('Actor');

      const actors = [
        {
          id: ACTOR_DISPATCHER_ID,
          email: 'dispatcher@zanafleet.test',
          username: 'jane_dispatcher',
          type: ActorType.Admin,
          workspaceId: 'ws-test-001',
          passwordHash: '$2b$10$hashedpasswordplaceholder',
          location: 'Nairobi, Kenya',
          roles: ['dispatcher'],
          linkedWallets: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: ACTOR_DRIVER_ID,
          email: 'driver@zanafleet.test',
          username: 'john_driver',
          type: ActorType.Driver,
          workspaceId: 'ws-test-001',
          passwordHash: '$2b$10$hashedpasswordplaceholder',
          location: 'Mombasa, Kenya',
          roles: ['driver'],
          linkedWallets: ['wallet-001'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: ACTOR_ADMIN_ID,
          email: 'admin@zanafleet.test',
          username: 'admin_user',
          type: ActorType.Admin,
          workspaceId: 'ws-test-001',
          passwordHash: '$2b$10$hashedpasswordplaceholder',
          location: 'Nairobi, Kenya',
          roles: ['admin'],
          linkedWallets: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const actor of actors) {
        await actorStore.save(actor);
      }

      // =========================================================================
      // 4. SEED ACTOR-PERSONA RELATIONSHIPS
      // =========================================================================
      const actorPersonaStore = storeFactory.getStore('ActorPersona');

      const actorPersonas = [
        {
          actorId: ACTOR_DISPATCHER_ID,
          personaId: PERSONA_DISPATCHER_ID,
          workspaceId: 'ws-test-001',
          assignedAt: new Date(),
        },
        {
          actorId: ACTOR_DRIVER_ID,
          personaId: PERSONA_DRIVER_ID,
          workspaceId: 'ws-test-001',
          assignedAt: new Date(),
        },
        {
          actorId: ACTOR_ADMIN_ID,
          personaId: PERSONA_ADMIN_ID,
          workspaceId: 'ws-test-001',
          assignedAt: new Date(),
        },
      ];

      for (const ap of actorPersonas) {
        await actorPersonaStore.save(ap);
      }

      // =========================================================================
      // 5. SEED PERSONA-CAPABILITY GRANTS
      // =========================================================================
      const personaCapStore = storeFactory.getStore('PersonaCapability');

      const personaCapabilities = [
        // Dispatcher gets booking create, view, assign + driver view
        {
          personaId: PERSONA_DISPATCHER_ID,
          capabilityId: CAP_BOOKING_CREATE_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_DISPATCHER_ID,
          capabilityId: CAP_BOOKING_VIEW_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_DISPATCHER_ID,
          capabilityId: CAP_BOOKING_ASSIGN_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_DISPATCHER_ID,
          capabilityId: CAP_DRIVER_VIEW_ID,
          grantedAt: new Date(),
        },
        // Driver gets booking view, cancel
        {
          personaId: PERSONA_DRIVER_ID,
          capabilityId: CAP_BOOKING_VIEW_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_DRIVER_ID,
          capabilityId: CAP_BOOKING_CANCEL_ID,
          grantedAt: new Date(),
        },
        // Admin gets everything
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_BOOKING_CREATE_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_BOOKING_VIEW_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_BOOKING_ASSIGN_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_BOOKING_CANCEL_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_DRIVER_VIEW_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_DRIVER_ASSIGN_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_REPORT_VIEW_ID,
          grantedAt: new Date(),
        },
        {
          personaId: PERSONA_ADMIN_ID,
          capabilityId: CAP_ADMIN_ALL_ID,
          grantedAt: new Date(),
        },
      ];

      for (const pc of personaCapabilities) {
        await personaCapStore.save(pc);
      }

      // =========================================================================
      // 6. SEED WORKFLOW PROCESS DEFINITIONS
      // =========================================================================
      const processDefStore = storeFactory.getStore('ProcessDefinition');

      await processDefStore.save({
        definitionId: PROCESS_MOVE_BOOKING_ID,
        name: 'MoveBookingProcess',
        description: 'Process for handling move bookings from creation to completion',
        version: '1.0.0',
        isActive: true,
        allowedStates: [
          ProcessState.DRAFT,
          ProcessState.ESTIMATE_REQUESTED,
          ProcessState.OPTIONS_PRESENTED,
          ProcessState.BOOKING_CONFIRMED,
          ProcessState.PAYMENT_AUTHORIZED,
          ProcessState.DRIVER_ASSIGNED,
          ProcessState.VEHICLE_ASSIGNED,
          ProcessState.IN_PROGRESS,
          ProcessState.COMPLETED,
          ProcessState.CANCELLED,
        ],
        initialState: ProcessState.DRAFT,
        terminalStates: [ProcessState.COMPLETED, ProcessState.CANCELLED],
        metadata: { contextType: 'MOVE_BOOKING' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // =========================================================================
      // 7. SEED WORKFLOW PROCESS INSTANCES
      // =========================================================================
      const processInstanceStore = storeFactory.getStore('ProcessInstance');

      const processInstances = [
        {
          instanceId: 'proc-inst-booking-001',
          definitionId: PROCESS_MOVE_BOOKING_ID,
          name: 'Move Booking #1001',
          currentState: ProcessState.BOOKING_CONFIRMED,
          status: ProcessInstanceStatus.ACTIVE,
          context: {
            pickupLocation: { latitude: -1.2921, longitude: 36.8219, address: 'Nairobi CBD' },
            dropoffLocation: { latitude: -1.3197, longitude: 36.7179, address: 'Karen, Nairobi' },
            scheduledPickup: new Date('2026-03-01T10:00:00Z'),
            cargoDescription: 'Office furniture - 5 boxes',
            estimatedWeight: 50,
          },
          relatedEntities: [
            { entityType: 'Actor', entityId: ACTOR_DISPATCHER_ID, role: 'createdBy', linkedAt: new Date() },
            { entityType: 'Actor', entityId: ACTOR_DRIVER_ID, role: 'assignedDriver', linkedAt: new Date() },
          ],
          triggeredBy: ACTOR_DISPATCHER_ID,
          correlationId: null,
          parentInstanceId: null,
          expiresAt: null,
          transitionCount: 2,
          history: [],
          createdAt: new Date(),
          completedAt: null,
        },
        {
          instanceId: 'proc-inst-booking-002',
          definitionId: PROCESS_MOVE_BOOKING_ID,
          name: 'Move Booking #1002',
          currentState: ProcessState.IN_PROGRESS,
          status: ProcessInstanceStatus.ACTIVE,
          context: {
            pickupLocation: { latitude: -1.2833, longitude: 36.8167, address: 'Westlands' },
            dropoffLocation: { latitude: -1.4067, longitude: 36.6500, address: 'Ruiru' },
            scheduledPickup: new Date('2026-03-01T14:00:00Z'),
            cargoDescription: 'Household items',
            estimatedWeight: 200,
          },
          relatedEntities: [
            { entityType: 'Actor', entityId: ACTOR_DISPATCHER_ID, role: 'createdBy', linkedAt: new Date() },
            { entityType: 'Actor', entityId: ACTOR_DRIVER_ID, role: 'assignedDriver', linkedAt: new Date() },
          ],
          triggeredBy: ACTOR_DISPATCHER_ID,
          correlationId: null,
          parentInstanceId: null,
          expiresAt: null,
          transitionCount: 3,
          history: [],
          createdAt: new Date(),
          completedAt: null,
        },
        {
          instanceId: 'proc-inst-booking-003',
          definitionId: PROCESS_MOVE_BOOKING_ID,
          name: 'Move Booking #1003',
          currentState: ProcessState.DRAFT,
          status: ProcessInstanceStatus.ACTIVE,
          context: {
            pickupLocation: { latitude: -1.2921, longitude: 36.8219, address: 'Kasarani' },
            dropoffLocation: { latitude: -1.1500, longitude: 37.0662, address: 'Thika' },
            scheduledPickup: null,
            cargoDescription: 'Construction materials',
            estimatedWeight: 500,
          },
          relatedEntities: [],
          triggeredBy: null,
          correlationId: null,
          parentInstanceId: null,
          expiresAt: null,
          transitionCount: 0,
          history: [],
          createdAt: new Date(),
          completedAt: null,
        },
      ];

      for (const instance of processInstances) {
        await processInstanceStore.save(instance);
      }

      // =========================================================================
      // 8. SEED BUSINESS/ORGANIZATION
      // =========================================================================
      const businessStore = storeFactory.getStore('Business');

      await businessStore.save({
        id: 'org-test-001',
        name: 'Test Logistics Ltd',
        type: 'logistics',
        status: 'active',
        createdAt: new Date(),
      });

      // eslint-disable-next-line no-console
      console.log('Dashboard scenario loaded successfully');
      // eslint-disable-next-line no-console
      console.log('  - Actors: 3 (dispatcher, driver, admin)');
      // eslint-disable-next-line no-console
      console.log('  - Personas: 3 (Dispatcher, Driver, Admin)');
      // eslint-disable-next-line no-console
      console.log('  - Capabilities: 8');
      // eslint-disable-next-line no-console
      console.log('  - Process Instances: 3');
    },
  };
}
