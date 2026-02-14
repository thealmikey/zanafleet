import { InteractionActorType } from '../entities/interaction-event.entity';

/**
 * Participant Types
 * 
 * These types represent any entity that can interact within the system.
 * This is a unified abstraction that encompasses:
 * - Human users
 * - Organizations
 * - Drivers/Riders
 * - AI Agents
 * - External Integrations (Slack, etc.)
 */

export type Participant =
  | UserParticipant
  | OrganizationParticipant
  | DriverParticipant
  | RiderParticipant
  | SystemParticipant
  | AIAgentParticipant
  | ExternalIntegrationParticipant;

export interface BaseParticipant {
  id: string;
  type: InteractionActorType;
  displayName: string;
  metadata?: Record<string, unknown>;
}

export interface UserParticipant extends BaseParticipant {
  type: InteractionActorType.USER;
  userId: string;
  email: string;
}

export interface OrganizationParticipant extends BaseParticipant {
  type: InteractionActorType.ORGANIZATION;
  organizationId: string;
  businessName: string;
}

export interface DriverParticipant extends BaseParticipant {
  type: InteractionActorType.DRIVER;
  driverId: string;
  vehicleId?: string;
}

export interface RiderParticipant extends BaseParticipant {
  type: InteractionActorType.RIDER;
  riderId: string;
}

export interface SystemParticipant extends BaseParticipant {
  type: InteractionActorType.SYSTEM;
  serviceName: string;
}

export interface AIAgentParticipant extends BaseParticipant {
  type: InteractionActorType.AI_AGENT;
  agentId: string;
  model?: string;
  capabilities: string[];
}

export interface ExternalIntegrationParticipant extends BaseParticipant {
  type: InteractionActorType.EXTERNAL_INTEGRATION;
  integrationType: 'SLACK' | 'TICKETING' | 'EMAIL' | 'API' | 'WEBHOOK';
  externalId?: string;
}

/**
 * Helper function to check if a participant is a specific type
 */
export function isUserParticipant(participant: Participant): participant is UserParticipant {
  return participant.type === InteractionActorType.USER;
}

export function isOrganizationParticipant(participant: Participant): participant is OrganizationParticipant {
  return participant.type === InteractionActorType.ORGANIZATION;
}

export function isDriverParticipant(participant: Participant): participant is DriverParticipant {
  return participant.type === InteractionActorType.DRIVER;
}

export function isRiderParticipant(participant: Participant): participant is RiderParticipant {
  return participant.type === InteractionActorType.RIDER;
}

export function isSystemParticipant(participant: Participant): participant is SystemParticipant {
  return participant.type === InteractionActorType.SYSTEM;
}

export function isAIAgentParticipant(participant: Participant): participant is AIAgentParticipant {
  return participant.type === InteractionActorType.AI_AGENT;
}

export function isExternalIntegrationParticipant(
  participant: Participant,
): participant is ExternalIntegrationParticipant {
  return participant.type === InteractionActorType.EXTERNAL_INTEGRATION;
}
