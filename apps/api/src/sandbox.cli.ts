/**
 * Sandbox CLI
 *
 * CLI command to run the API in sandbox mode with in-memory storage.
 * Usage: pnpm sandbox --scenario=<name>
 */
/* eslint-disable no-console */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { InMemoryStoreFactoryService } from './core/sandbox/in-memory-store.factory';
import { SANDBOX_ENV_VAR, DEFAULT_SCENARIO } from './core/sandbox/sandbox.constants';
import { SeedScenarioRegistry } from './core/sandbox/seed-scenario.registry';

/**
 * CLI Options
 */
interface CliOptions {
  scenario?: string;
  help?: boolean;
  listScenarios?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list' || arg === '-l') {
      options.listScenarios = true;
    } else if (arg.startsWith('--scenario=')) {
      options.scenario = arg.replace('--scenario=', '');
    } else if (arg.startsWith('-s=')) {
      options.scenario = arg.replace('-s=', '');
    }
  }

  return options;
}

/**
 * Print available scenarios
 */
function printScenarios(registry: SeedScenarioRegistry): void {
  const scenarios = registry.getAll();

  console.log('\n📋 Available Sandbox Scenarios:\n');
  console.log('  Available scenarios:');

  if (scenarios.length === 0) {
    console.log('    (none registered)');
  } else {
    for (const scenario of scenarios) {
      console.log(`    - ${scenario.name}: ${scenario.description}`);
    }
  }

  console.log('\n');
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
🏖️  ZanaFleet Sandbox CLI

Usage:
  pnpm sandbox [options]

Options:
  --scenario=<name>    Load a specific scenario on startup (default: ${DEFAULT_SCENARIO})
  --list, -l          List available scenarios
  --help, -h          Show this help message

Examples:
  pnpm sandbox                           # Start with default scenario
  pnpm sandbox --scenario=minimal       # Start with minimal scenario
  pnpm sandbox --scenario=full          # Start with full scenario
  pnpm sandbox --list                    # List available scenarios

Environment Variables:
  USE_IN_MEMORY_DB=true    Enable sandbox mode (automatically set by CLI)
  NODE_ENV=development    Recommended for sandbox mode

Notes:
  - Sandbox mode uses in-memory storage instead of PostgreSQL/Neo4j
  - Data is not persisted between restarts
  - Background agents are disabled by default
`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const logger = new Logger('SandboxCLI');
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Show help
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Set sandbox environment variable
  process.env[SANDBOX_ENV_VAR] = 'true';

  // Check for list scenarios option (need to bootstrap first)
  if (options.listScenarios) {
    try {
      const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
      });

      const registry = app.get(SeedScenarioRegistry);
      printScenarios(registry);

      await app.close();
      process.exit(0);
    } catch (error) {
      console.error('Failed to list scenarios:', (error as Error).message);
      process.exit(1);
    }
  }

  // Determine scenario
  const scenario = options.scenario || process.env.SANDBOX_SCENARIO || DEFAULT_SCENARIO;

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    🏖️  ZanaFleet Sandbox                   ║
╠═══════════════════════════════════════════════════════════╣
║  Mode: In-Memory Database                                  ║
║  Scenario: ${scenario.padEnd(45)}║
╚═══════════════════════════════════════════════════════════╝
  `);

  try {
    // Create application with sandbox mode
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });

    // Get the seed scenario registry and load scenario
    const registry = app.get(SeedScenarioRegistry);
    const storeFactory = app.get(InMemoryStoreFactoryService);

    // Check if scenario exists
    if (!registry.has(scenario)) {
      console.log(`\n⚠️  Scenario '${scenario}' not found. Available scenarios:\n`);
      printScenarios(registry);

      // Try to load minimal anyway if available
      if (scenario !== DEFAULT_SCENARIO && registry.has(DEFAULT_SCENARIO)) {
        console.log(`Falling back to default scenario: ${DEFAULT_SCENARIO}\n`);
        await registry.load(DEFAULT_SCENARIO);
      } else {
        logger.warn('No scenarios available. Running with empty store.');
      }
    } else {
      // Load the requested scenario
      await registry.load(scenario);
    }

    // Print store statistics
    const entityNames = storeFactory.getEntityNames();
    console.log('\n📊 In-Memory Stores Initialized:');
    for (const name of entityNames) {
      const store = storeFactory.getStore(name);
      const count = await store.count();
      console.log(`   - ${name}: ${count} records`);
    }

    // Start the server
    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`
✅ Sandbox is running!

   API:        http://localhost:${port}
   Health:     http://localhost:${port}/health
   Sandbox:    http://localhost:${port}/sandbox

   Press Ctrl+C to stop

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Handle graceful shutdown
    process.on('SIGINT', () => void app.close().then(() => process.exit(0)));
    process.on('SIGTERM', () => void app.close().then(() => process.exit(0)));
  } catch (error) {
    logger.error('Failed to start sandbox:', error);
    console.error('\n❌ Failed to start sandbox:', (error as Error).message);
    console.log('\nMake sure you have all dependencies installed:');
    console.log('   pnpm install\n');
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
