/**
 * Concert Scenario Seed
 *
 * Nairobi Music Festival 2026 - Seed Data
 * Demonstrates complex event logistics with 12 asset movements.
 */

import { v4 as uuidv4 } from 'uuid';

import { InMemoryStoreFactoryService } from '../../../core/sandbox/in-memory-store.factory';

interface SeedScenario {
  name: string;
  description: string;
  load: () => Promise<void>;
}

/**
 * Event Organizer ID
 */
const EventCoId = 'org-eventco-2026';

/**
 * Concert Bundle ID
 */
const NairobiMusicFestivalBundleId = 'bundle-nairobi-music-fest-2026';

/**
 * Create concert scenario seed
 */
export function createConcertScenario(
  storeFactory: InMemoryStoreFactoryService
): SeedScenario {
  return {
    name: 'concert',
    description: 'Nairobi Music Festival 2026 - Complex event logistics',
    load: async () => {
      // Seed Business/Organization
      const businessStore = storeFactory.getStore('Business');
      await businessStore.save({
        id: EventCoId,
        name: 'EventCo Productions',
        type: 'event_organizer',
        status: 'active',
        createdAt: new Date(),
      });

      // Seed Bundle
      const bundleStore = storeFactory.getStore('Bundle');
      await bundleStore.save({
        id: NairobiMusicFestivalBundleId,
        name: 'Nairobi Music Festival 2026',
        description: '2-day outdoor concert at Uhuru Park - 10,000 attendees',
        ownerId: EventCoId,
        status: 'confirmed',
        startDate: new Date('2026-03-15T00:00:00Z'),
        endDate: new Date('2026-03-19T23:59:59Z'),
        budgetAmount: 800000,
        metadata: {
          eventType: 'Music Festival',
          venue: 'Uhuru Park, Nairobi',
          expectedAttendees: 10000,
        },
        createdAt: new Date(),
      });

      // Seed Assets
      const assetStore = storeFactory.getStore('Asset');
      const assets = [
        {
          id: uuidv4(),
          name: 'Isuzu FXZ 28-330 - KDB 829C',
          type: 'VEHICLE',
          status: 'ACTIVE',
          ownerId: 'owner-westside-logistics',
          ownerType: 'Organization',
          capacity: { volumeCBM: 45, weightKG: 8000 },
          metadata: { purpose: 'Stage Equipment Transport', dailyRate: 35000 },
          homeBase: { latitude: -1.2674, longitude: 36.8078, label: 'Westlands, Nairobi' },
        },
        {
          id: uuidv4(),
          name: 'Mitsubishi Canter - KCQ 121A',
          type: 'VEHICLE',
          status: 'ACTIVE',
          ownerId: 'owner-industrial-movers',
          ownerType: 'Organization',
          capacity: { volumeCBM: 30, weightKG: 5000 },
          metadata: { purpose: 'Scaffolding Transport', dailyRate: 25000 },
          homeBase: { latitude: -1.3167, longitude: 36.8833, label: 'Industrial Area, Nairobi' },
        },
        {
          id: uuidv4(),
          name: 'Toyota Hiace Refrigerated - KCL 455X',
          type: 'VEHICLE',
          status: 'ACTIVE',
          ownerId: 'owner-fresh-express',
          ownerType: 'Organization',
          capacity: { volumeCBM: 12, temperatureC: 4 },
          metadata: { purpose: 'Catering Supplies', dailyRate: 18000, coldChain: true },
          homeBase: { latitude: -1.3029, longitude: 36.7072, label: 'Karen, Nairobi' },
        },
      ];

      for (const asset of assets) {
        await assetStore.save(asset);
      }

      // Seed Workflow Process Definition
      const processDefStore = storeFactory.getStore('ProcessDefinition');
      await processDefStore.save({
        definitionId: uuidv4(),
        name: 'EventLogisticsProcess',
        description: 'Process for managing event logistics workflows',
        version: '1.0.0',
        isActive: true,
        allowedStates: ['draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'],
        initialState: 'draft',
        terminalStates: ['completed', 'cancelled'],
        metadata: { eventType: 'logistics' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // eslint-disable-next-line no-console
      console.log('Concert scenario loaded successfully');
    },
  };
}
