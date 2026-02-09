/**
 * Projections Module Public API
 *
 * Re-exports all public components of the projections infrastructure.
 */

export {
  ProjectionBuilder,
  ProjectionState,
  UpsertOptions,
  RelationshipUpsertOptions,
} from './projection-builder.base';
export { ProjectionsModule, ProjectionsModuleOptions } from './projections.module';
