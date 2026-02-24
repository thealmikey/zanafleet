// Re-export enums from separate files to avoid circular dependency issues
// These can be imported without loading the full entity classes

// ProcessState from separate enum file - this is key to breaking the cycle!
export { ProcessState } from './process-state.enum';

// Transition related enums from process-transition.entity.ts
export { TransitionTriggerType, GuardType } from './process-transition.entity';

// ProcessInstanceStatus from process-instance.entity.ts
export { ProcessInstanceStatus } from './process-instance.entity';

// Export entities - these should be imported separately when needed
export { ProcessDefinitionEntity } from './process-definition.entity';
export { ProcessTransitionEntity } from './process-transition.entity';
export { ProcessInstanceEntity } from './process-instance.entity';
