import { Module } from '@nestjs/common';
import { ComponentRegistryService } from './registry/component-registry.service';
import { UISchemaCompilerService } from './compiler/compiler.service';
import { UIComposerService } from './composer/composer.service';
import { ValidationService } from './validation/validation.service';
import { TelemetryService } from './telemetry/telemetry.service';

// Export all types
export * from './schema/v1/types';

// Export services
export { ComponentRegistryService } from './registry/component-registry.service';
export { UISchemaCompilerService } from './compiler/compiler.service';
export { UIComposerService } from './composer/composer.service';
export { ValidationService } from './validation/validation.service';
export { TelemetryService } from './telemetry/telemetry.service';

@Module({
  providers: [
    ComponentRegistryService,
    UISchemaCompilerService,
    UIComposerService,
    ValidationService,
    TelemetryService,
  ],
  exports: [
    ComponentRegistryService,
    UISchemaCompilerService,
    UIComposerService,
    ValidationService,
    TelemetryService,
  ],
})
export class UIRuntimeModule {}
