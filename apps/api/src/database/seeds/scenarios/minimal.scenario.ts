/**
 * Minimal Scenario Seed
 *
 * Minimal test data for basic API functionality testing.
 */

import { v4 as uuidv4 } from 'uuid';

import { InMemoryStoreFactoryService } from '../../../core/sandbox/in-memory-store.factory';

interface SeedScenario {
  name: string;
  description: string;
  load: () => Promise<void>;
}

/**
 * Create minimal scenario seed
 */
export function createMinimalScenario(
  storeFactory: InMemoryStoreFactoryService
): SeedScenario {
  return {
    name: 'minimal',
    description: 'Minimal test data for basic API functionality',
    load: async () => {
      // Seed minimal business
      const businessStore = storeFactory.getStore('Business');
      await businessStore.save({
        id: 'org-test-001',
        name: 'Test Organization',
        type: 'test',
        status: 'active',
        createdAt: new Date(),
      });

      // Seed minimal workflow process
      const processDefStore = storeFactory.getStore('ProcessDefinition');
      await processDefStore.save({
        definitionId: uuidv4(),
        name: 'TestProcess',
        description: 'Test process for minimal scenario',
        version: '1.0.0',
        isActive: true,
        allowedStates: ['draft', 'active', 'completed'],
        initialState: 'draft',
        terminalStates: ['completed'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Seed minimal capability
      const capabilityStore = storeFactory.getStore('Capability');
      await capabilityStore.save({
        id: uuidv4(),
        name: 'test.capability',
        description: 'Test capability for sandbox mode',
        category: 'test',
        requiresConsent: false,
        version: '1.0.0',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // eslint-disable-next-line no-console
      console.log('Minimal scenario loaded successfully');
    },
  };
}
