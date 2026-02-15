import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { InteractionEventRepository } from '../../../interaction/repositories/interaction-event.repository';
import { CapabilityProposalEntity } from '../../entities/capability-proposal.entity';
import { ProposalStatus, InvocationMode, ConfirmationAction } from '../../enums/consent.enums';
import { CapabilityOrchestrator, CapabilityHandler } from '../../services/capability-orchestrator.service';
import { ConfidenceThresholdService } from '../../services/confidence-threshold.service';
import { ConsentConfirmationService } from '../../services/consent-confirmation.service';

describe('Consent Integration Tests', () => {
  let consentService: ConsentConfirmationService;
  let orchestrator: CapabilityOrchestrator;
  let thresholdService: ConfidenceThresholdService;
  let mockProposalRepository: any;
  let mockInteractionEventRepository: any;

  // Mock handlers
  const mockHandlers = {
    CreateOrder: {
      execute: jest.fn().mockResolvedValue({ orderId: 'order-123', amount: 100 }),
    },
    ProcessPayment: {
      execute: jest.fn().mockResolvedValue({ paymentId: 'payment-123', status: 'completed' }),
    },
    Search: {
      execute: jest.fn().mockResolvedValue({ results: ['result1', 'result2'] }),
    },
  };

  const createMockProposalRepository = () => ({
    create: jest.fn().mockImplementation((data: any) => data),
    save: jest.fn().mockImplementation(async (data: any) => ({ ...data, proposalId: data.proposalId || 'proposal-1' })),
    findOne: jest.fn(),
    find: jest.fn(),
  });

  beforeEach(async () => {
    mockProposalRepository = createMockProposalRepository();
    mockInteractionEventRepository = {
      appendToStream: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentConfirmationService,
        CapabilityOrchestrator,
        ConfidenceThresholdService,
        {
          provide: getRepositoryToken(CapabilityProposalEntity),
          useValue: mockProposalRepository,
        },
        {
          provide: InteractionEventRepository,
          useValue: mockInteractionEventRepository,
        },
      ],
    }).compile();

    consentService = module.get<ConsentConfirmationService>(ConsentConfirmationService);
    orchestrator = module.get<CapabilityOrchestrator>(CapabilityOrchestrator);
    thresholdService = module.get<ConfidenceThresholdService>(ConfidenceThresholdService);

    // Register handlers
    Object.entries(mockHandlers).forEach(([name, handler]) => {
      orchestrator.registerHandler(name, handler as CapabilityHandler);
    });

    jest.clearAllMocks();
  });

  describe('Full Consent Workflow', () => {
    it('should create proposal, confirm, and execute successfully', async () => {
      // Step 1: Check if we should propose based on confidence
      // Order capabilities require 0.90 threshold
      const shouldPropose = thresholdService.shouldPropose(0.90, 'CreateOrder');
      expect(shouldPropose).toBe(true);

      // Step 2: Create proposal
      // Order capabilities require 0.90 confidence threshold
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { amount: 100 },
        0.90,
        [],
        'Create order for 100',
      );
      expect(proposal.status).toBe(ProposalStatus.PROPOSED);
      expect(proposal.proposalId).toBeDefined();

      // Step 3: Confirm proposal - mock findOne to return proposal with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      const confirmResult = await consentService.processConfirmation(
        proposal.proposalId,
        ConfirmationAction.CONFIRM,
        'user-1',
      );
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.proposal.status).toBe(ProposalStatus.CONFIRMED);

      // Step 4: Execute capability - mock findOne to return proposal with CONFIRMED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.CONFIRMED });
      
      const executeResult = await orchestrator.execute(proposal.proposalId);
      expect(executeResult.success).toBe(true);
      expect(executeResult.result).toEqual({ orderId: 'order-123', amount: 100 });
    });

    it('should reject proposal and not execute', async () => {
      // Create proposal
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { amount: 100 },
        0.85,
        [],
        'Create order for 100',
      );

      // Confirm proposal exists with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      // Reject proposal
      const rejectResult = await consentService.processConfirmation(
        proposal.proposalId,
        ConfirmationAction.REJECT,
        'user-1',
        undefined,
        'Not needed',
      );
      expect(rejectResult.success).toBe(true);
      expect(rejectResult.proposal.status).toBe(ProposalStatus.REJECTED);

      // Try to execute - should fail because status is REJECTED
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.REJECTED });
      await expect(orchestrator.execute(proposal.proposalId)).rejects.toThrow();
    });

    it('should require higher confidence for payments', () => {
      // Payment requires 0.95 threshold
      const paymentShouldPropose = thresholdService.shouldPropose(0.90, 'ProcessPayment');
      expect(paymentShouldPropose).toBe(false);

      const paymentShouldClarify = thresholdService.shouldClarify(0.90, 'ProcessPayment');
      expect(paymentShouldClarify).toBe(true);

      // High enough confidence should propose
      const highConfidenceShouldPropose = thresholdService.shouldPropose(0.96, 'ProcessPayment');
      expect(highConfidenceShouldPropose).toBe(true);
    });

    it('should allow lower confidence for search', () => {
      // Search has lower threshold (0.70)
      const searchShouldPropose = thresholdService.shouldPropose(0.75, 'Search');
      expect(searchShouldPropose).toBe(true);
    });

    it('should handle proposal modification', async () => {
      // Create proposal
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { amount: 100 },
        0.85,
        [],
        'Create order for 100',
      );

      // Confirm proposal exists with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      // Modify inputs
      const modifyResult = await consentService.processConfirmation(
        proposal.proposalId,
        ConfirmationAction.MODIFY,
        'user-1',
        { amount: 200 },
      );
      expect(modifyResult.success).toBe(true);
      expect(modifyResult.proposal.extractedInputs).toEqual({ amount: 200 });
    });

    it('should handle capability switch', async () => {
      // Create proposal with wrong capability
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { query: 'test' },
        0.85,
        [],
        'Search for test',
      );

      // Confirm proposal exists with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      // Switch to Search capability - pass new capability name in modifiedInputs
      const switchResult = await consentService.processConfirmation(
        proposal.proposalId,
        ConfirmationAction.SWITCH_CAPABILITY,
        'user-1',
        { capabilityName: 'Search', query: 'test' },
      );
      expect(switchResult.success).toBe(true);
    });
  });

  describe('Navigation Intent Generation', () => {
    it('should generate correct navigation routes for different capabilities', async () => {
      // Create and confirm proposal for CreateOrder
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { amount: 100 },
        0.85,
        [],
        'Create order',
      );

      // Confirm proposal - mock with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      await consentService.processConfirmation(proposal.proposalId, ConfirmationAction.CONFIRM, 'user-1');

      // Execute - mock with CONFIRMED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.CONFIRMED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));
      mockInteractionEventRepository.appendToStream.mockResolvedValue({});

      const result = await orchestrator.execute(proposal.proposalId);
      
      expect(result.navigationIntent).toBeDefined();
      expect(result.navigationIntent?.targetRoute).toBe('/orders');
      expect(result.navigationIntent?.invocationMode).toBe(InvocationMode.CONVERSATIONAL);
    });
  });

  describe('Confidence-based Decision Making', () => {
    it('should determine correct action based on confidence levels', () => {
      // Very low confidence - should reject
      expect(thresholdService.getRecommendedAction(0.30, 'CreateOrder')).toBe('reject');

      // Low confidence (below minimum bar) - should reject
      expect(thresholdService.getRecommendedAction(0.50, 'CreateOrder')).toBe('reject');

      // Medium confidence - between minimum bar and threshold - should clarify
      // For Order capabilities: minimum bar = 0.60, threshold = 0.90
      expect(thresholdService.getRecommendedAction(0.70, 'CreateOrder')).toBe('clarify');

      // High confidence - meets threshold - should propose
      expect(thresholdService.getRecommendedAction(0.90, 'CreateOrder')).toBe('propose');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent proposal execution', async () => {
      mockProposalRepository.findOne.mockResolvedValue(null);

      await expect(orchestrator.execute('non-existent')).rejects.toThrow();
    });

    it('should handle unregistered capability', async () => {
      const proposal = await consentService.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'UnregisteredCapability',
        {},
        0.85,
        [],
        'Test',
      );

      // Confirm proposal - mock with PROPOSED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.PROPOSED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));

      await consentService.processConfirmation(proposal.proposalId, ConfirmationAction.CONFIRM, 'user-1');

      // Execute - mock with CONFIRMED status
      mockProposalRepository.findOne.mockResolvedValue({ ...proposal, status: ProposalStatus.CONFIRMED });
      mockProposalRepository.save.mockImplementation(async (data: any) => ({ ...proposal, ...data }));
      mockInteractionEventRepository.appendToStream.mockResolvedValue({});

      const result = await orchestrator.execute(proposal.proposalId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler registered');
    });
  });
});
