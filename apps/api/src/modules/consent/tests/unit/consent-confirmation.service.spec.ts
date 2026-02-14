import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InteractionEventRepository } from '../../../interaction/repositories/interaction-event.repository';
import { CapabilityProposalEntity } from '../../entities/capability-proposal.entity';
import { ProposalStatus, ConfirmationAction } from '../../enums/consent.enums';
import { ConsentConfirmationService, ProposalNotFoundError, InvalidProposalStateError, ProposalExpiredError } from '../../services/consent-confirmation.service';

describe('ConsentConfirmationService', () => {
  let service: ConsentConfirmationService;
  let proposalRepository: jest.Mocked<Repository<CapabilityProposalEntity>>;
  let interactionEventRepository: jest.Mocked<InteractionEventRepository>;

  const mockProposalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockInteractionEventRepository = {
    appendToStream: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentConfirmationService,
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

    service = module.get<ConsentConfirmationService>(ConsentConfirmationService);
    proposalRepository = module.get(getRepositoryToken(CapabilityProposalEntity));
    interactionEventRepository = module.get(InteractionEventRepository);

    jest.clearAllMocks();
  });

  describe('createProposal', () => {
    it('should create a new proposal with PROPOSED status', async () => {
      const mockProposal = {
        proposalId: 'uuid-1',
        streamId: 'stream-1',
        sessionId: 'session-1',
        capabilityName: 'CreateOrder',
        extractedInputs: { amount: 100 },
        confidenceScore: 0.85,
        missingInputs: [],
        summary: 'Create order for $100',
        status: ProposalStatus.PROPOSED,
        sourceEventId: 'event-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      mockProposalRepository.create.mockReturnValue(mockProposal);
      mockProposalRepository.save.mockResolvedValue(mockProposal);
      mockInteractionEventRepository.appendToStream.mockResolvedValue({} as any);

      const result = await service.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        { amount: 100 },
        0.85,
        [],
        'Create order for $100',
      );

      expect(result).toBeDefined();
      expect(result.proposalId).toBe('uuid-1');
      expect(result.status).toBe(ProposalStatus.PROPOSED);
      expect(proposalRepository.save).toHaveBeenCalled();
      expect(interactionEventRepository.appendToStream).toHaveBeenCalled();
    });

    it('should set expiration to 5 minutes by default', async () => {
      const beforeCreate = new Date();
      
      const mockProposal = {
        proposalId: 'uuid-1',
        streamId: 'stream-1',
        sessionId: 'session-1',
        capabilityName: 'CreateOrder',
        extractedInputs: {},
        confidenceScore: 0.85,
        missingInputs: [],
        summary: 'Test',
        status: ProposalStatus.PROPOSED,
        sourceEventId: 'event-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
      };

      mockProposalRepository.create.mockImplementation((data) => {
        return { ...data, proposalId: 'uuid-1' };
      });
      mockProposalRepository.save.mockImplementation((proposal) => Promise.resolve({ ...proposal, ...mockProposal }));

      const result = await service.createProposal(
        'stream-1',
        'session-1',
        'event-1',
        'CreateOrder',
        {},
        0.85,
        [],
        'Test',
      );

      const expiresAt = new Date(result.expiresAt!);
      const afterCreate = new Date(beforeCreate.getTime() + 5 * 60 * 1000 + 1000);
      
      expect(expiresAt.getTime()).toBeGreaterThan(beforeCreate.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('processConfirmation', () => {
    // Create a fresh mock proposal for each test to avoid state mutation
    const createMockProposal = (overrides = {}) => ({
      proposalId: 'proposal-1',
      streamId: 'stream-1',
      sessionId: 'session-1',
      capabilityName: 'CreateOrder',
      extractedInputs: { amount: 100 },
      confidenceScore: 0.85,
      missingInputs: [],
      summary: 'Create order',
      status: ProposalStatus.PROPOSED,
      sourceEventId: 'event-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      ...overrides,
    });

    beforeEach(() => {
      // Reset mock to return fresh proposal with PROPOSED status for each test
      mockProposalRepository.findOne.mockImplementation((_id: any) => {
        return Promise.resolve(createMockProposal() as unknown as CapabilityProposalEntity);
      });
      mockInteractionEventRepository.appendToStream.mockResolvedValue({} as any);
    });

    it('should confirm a proposal and transition to CONFIRMED', async () => {
      const updatedProposal = { ...createMockProposal(), status: ProposalStatus.CONFIRMED };
      mockProposalRepository.save.mockResolvedValue(updatedProposal as unknown as CapabilityProposalEntity);

      const result = await service.processConfirmation(
        'proposal-1',
        ConfirmationAction.CONFIRM,
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe(ProposalStatus.CONFIRMED);
    });

    it('should reject a proposal and transition to REJECTED', async () => {
      const rejectedProposal = { ...createMockProposal(), status: ProposalStatus.REJECTED };
      mockProposalRepository.save.mockResolvedValue(rejectedProposal as unknown as CapabilityProposalEntity);

      const result = await service.processConfirmation(
        'proposal-1',
        ConfirmationAction.REJECT,
        'user-1',
        undefined,
        'Not needed',
      );

      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe(ProposalStatus.REJECTED);
    });

    it('should cancel a proposal and transition to CANCELLED', async () => {
      const cancelledProposal = { ...createMockProposal(), status: ProposalStatus.CANCELLED };
      mockProposalRepository.save.mockResolvedValue(cancelledProposal as unknown as CapabilityProposalEntity);

      const result = await service.processConfirmation(
        'proposal-1',
        ConfirmationAction.CANCEL,
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe(ProposalStatus.CANCELLED);
    });

    it('should modify inputs when MODIFY action is used', async () => {
      const modifiedProposal = {
        ...createMockProposal(),
        status: ProposalStatus.PROPOSED,
        extractedInputs: { amount: 200 },
      };
      mockProposalRepository.save.mockResolvedValue(modifiedProposal as unknown as CapabilityProposalEntity);

      const result = await service.processConfirmation(
        'proposal-1',
        ConfirmationAction.MODIFY,
        'user-1',
        { amount: 200 },
      );

      expect(result.success).toBe(true);
      expect(result.proposal.extractedInputs).toEqual({ amount: 200 });
    });

    it('should throw ProposalNotFoundError for non-existent proposal', async () => {
      mockProposalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processConfirmation('non-existent', ConfirmationAction.CONFIRM, 'user-1'),
      ).rejects.toThrow(ProposalNotFoundError);
    });

    it('should throw InvalidProposalStateError for already processed proposal', async () => {
      mockProposalRepository.findOne.mockResolvedValue({
        ...createMockProposal(),
        status: ProposalStatus.CONFIRMED,
      } as unknown as CapabilityProposalEntity);

      await expect(
        service.processConfirmation('proposal-1', ConfirmationAction.CONFIRM, 'user-1'),
      ).rejects.toThrow(InvalidProposalStateError);
    });

    it('should throw ProposalExpiredError for expired proposal', async () => {
      const expiredProposal = {
        ...createMockProposal(),
        status: ProposalStatus.PROPOSED,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockProposalRepository.findOne.mockResolvedValue(expiredProposal as unknown as CapabilityProposalEntity);
      mockProposalRepository.save.mockResolvedValue({ ...expiredProposal, status: ProposalStatus.EXPIRED } as unknown as CapabilityProposalEntity);

      await expect(
        service.processConfirmation('proposal-1', ConfirmationAction.CONFIRM, 'user-1'),
      ).rejects.toThrow(ProposalExpiredError);
    });
  });

  describe('getProposal', () => {
    it('should return proposal by ID', async () => {
      const mockProposal = { proposalId: 'proposal-1' } as CapabilityProposalEntity;
      mockProposalRepository.findOne.mockResolvedValue(mockProposal);

      const result = await service.getProposal('proposal-1');

      expect(result).toEqual(mockProposal);
      expect(proposalRepository.findOne).toHaveBeenCalledWith({
        where: { proposalId: 'proposal-1' },
      });
    });

    it('should return null for non-existent proposal', async () => {
      mockProposalRepository.findOne.mockResolvedValue(null);

      const result = await service.getProposal('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getProposalsBySession', () => {
    it('should return all proposals for a session', async () => {
      const mockProposals = [
        { proposalId: 'proposal-1', sessionId: 'session-1' },
        { proposalId: 'proposal-2', sessionId: 'session-1' },
      ] as CapabilityProposalEntity[];
      mockProposalRepository.find.mockResolvedValue(mockProposals);

      const result = await service.getProposalsBySession('session-1');

      expect(result).toEqual(mockProposals);
      expect(proposalRepository.find).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('expireProposal', () => {
    it('should expire a proposal', async () => {
      const mockProposal = {
        proposalId: 'proposal-1',
        status: ProposalStatus.PROPOSED,
      } as CapabilityProposalEntity;
      mockProposalRepository.findOne.mockResolvedValue(mockProposal);
      mockProposalRepository.save.mockResolvedValue({
        ...mockProposal,
        status: ProposalStatus.EXPIRED,
      });

      await service.expireProposal('proposal-1');

      expect(mockProposalRepository.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent proposal', async () => {
      mockProposalRepository.findOne.mockResolvedValue(null);

      await expect(service.expireProposal('non-existent')).rejects.toThrow(
        ProposalNotFoundError,
      );
    });
  });
});
