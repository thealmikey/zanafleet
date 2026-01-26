/**
 * Workspace Module Exports
 *
 * Public API for the Workspace module
 * Other modules should import from this barrel file
 */

// DTOs
export * from './dto/create-workspace.dto';

// Commands
export * from './commands/create-workspace.command';

// Events
export * from './events/workspace-created.event';

// Entities
export * from './entities/workspace.entity';

// Module
export * from './workspace.module';
