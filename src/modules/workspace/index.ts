/**
 * Workspace Module Exports
 *
 * Public API for the Workspace module
 * Other modules should import from this barrel file
 */

// Enums
export * from './dto/workspace.enums';

// DTOs
export * from './dto/create-workspace.dto';
export * from './dto/update-workspace.dto';

// Controllers
export * from './controllers/workspace.controller';

// Commands
export * from './commands/create-workspace.command';
export * from './commands/update-workspace.command';
export * from './commands/add-actor-to-workspace.command';
export * from './commands/remove-actor-from-workspace.command';

// Events
export * from './events/workspace-created.event';
export * from './events/workspace-updated.event';
export * from './events/actor-added-to-workspace.event';
export * from './events/actor-removed-from-workspace.event';

// Entities
export * from './entities/workspace.entity';
export * from './entities/membership.entity';

// Module
export * from './workspace.module';
