import { ActionType, ComponentType } from '../enums/consent.enums';

import { NavigationIntentDto } from './navigation-intent.dto';

/**
 * Action suggested to user
 */
export class ActionDto {
  type!: ActionType;
  label!: string;
  description?: string;
  payload?: Record<string, unknown>;
  icon?: string;

  constructor(partial: Partial<ActionDto>) {
    Object.assign(this, partial);
  }
}

/**
 * UI Component for rich responses
 */
export class UIComponentDto {
  type!: ComponentType;
  data!: Record<string, unknown>;
  actions?: ActionDto[];

  constructor(partial: Partial<UIComponentDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Simplified CapabilityProposal for DTO responses
 */
export class CapabilityProposalDto {
  proposalId!: string;
  capabilityName!: string;
  extractedInputs!: Record<string, unknown>;
  confidenceScore!: number;
  missingInputs!: string[];
  summary!: string;
  status!: string;
  invocationMode?: string;
  createdAt!: Date;
  expiresAt?: Date;

  constructor(partial: Partial<CapabilityProposalDto>) {
    Object.assign(this, partial);
  }
}

/**
 * ChatResponse DTO
 *
 * The updated ChatResponse structure that supports consent-driven interactions.
 */
export class ChatResponseDto {
  /**
   * The main text response from AI
   */
  text!: string;

  /**
   * Proposed capabilities awaiting user confirmation
   */
  proposals?: CapabilityProposalDto[];

  /**
   * Suggested actions for the user
   */
  suggestedActions?: ActionDto[];

  /**
   * UI components to render
   */
  components?: UIComponentDto[];

  /**
   * Whether this response requires user confirmation before execution
   */
  requiresConfirmation!: boolean;

  /**
   * Navigation intent after capability execution
   */
  navigationIntent?: NavigationIntentDto;

  constructor(partial: Partial<ChatResponseDto>) {
    Object.assign(this, partial);
    this.requiresConfirmation = this.requiresConfirmation ?? false;
  }
}
