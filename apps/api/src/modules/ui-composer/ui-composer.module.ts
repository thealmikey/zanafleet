import { Module, OnModuleInit } from '@nestjs/common';

import { CapabilityModule } from '../capability/capability.module';
import { WorkflowModule } from '../workflow/workflow.module';

import { ComponentRegistryService } from './services/component-registry.service';
import { UIComposerService } from './services/ui-composer.service';
import { MoveBookingStateRenderer } from './strategies/move-booking-renderer';

/**
 * UIComposerModule
 *
 * Provides the Presentation Engine for composing UI responses.
 *
 * This module is purely READ-ONLY:
 * - It does NOT mutate state
 * - It does NOT execute commands
 * - It does NOT duplicate business rules
 * - It READS process state from WorkflowEngine
 * - It READS capabilities from CapabilityAccessController
 * - It DECLARES what UI should show
 *
 * Integration:
 * - WorkflowModule: For reading process state
 * - CapabilityModule: For reading actor capabilities
 */
@Module({
  imports: [
    // Import CapabilityModule for capability access
    CapabilityModule,
    // Import WorkflowModule for process state
    WorkflowModule,
  ],
  providers: [
    // Component registry - provides predefined component definitions
    ComponentRegistryService,
    // Main UIComposer service
    UIComposerService,
    // MoveBooking state renderer (example implementation)
    MoveBookingStateRenderer,
  ],
  exports: [
    // Export UIComposerService for use by controllers
    UIComposerService,
    // Export ComponentRegistry for extensions
    ComponentRegistryService,
  ],
})
export class UIComposerModule implements OnModuleInit {
  constructor(
    private readonly uiComposer: UIComposerService,
    private readonly moveBookingRenderer: MoveBookingStateRenderer
  ) {}

  /**
   * Initialize the module
   *
   * Registers the MoveBooking renderer on module initialization.
   */
  onModuleInit(): void {
    this.uiComposer.registerRenderer(this.moveBookingRenderer);
  }
}
