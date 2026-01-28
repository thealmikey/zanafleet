// Mock @nestjs/swagger to avoid import errors in test environment
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => {},
  ApiPropertyOptional: () => () => {},
}), { virtual: true });

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { SignUpController } from '../../controllers/signup.controller';
import { SignUpSessionStatus } from '../../dto/signup.enums';

describe('SignUpController', () => {
  let controller: SignUpController;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockQueryBus = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignUpController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<SignUpController>(SignUpController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiate', () => {
    it('should initiate signup and return session info', async () => {
      const sessionId = uuidv4();
      const expiresAt = new Date();
      const body = { actorType: ActorType.Rider };

      mockCommandBus.execute.mockResolvedValue({ sessionId, expiresAt });

      const result = await controller.initiate(body);

      expect(result).toEqual({
        sessionId,
        expiresAt: expiresAt.toISOString(),
      });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });

    it('should throw BadRequestException on validation failure', async () => {
      const body = { actorType: 'INVALID' };

      await expect(controller.initiate(body as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStep', () => {
    it('should update signup step and return progress', async () => {
      const sessionId = uuidv4();
      const body = { stepName: 'identity', roles: ['Rider'] };

      mockCommandBus.execute.mockResolvedValue({
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['identity'],
      });

      const result = await controller.updateStep(sessionId, body);

      expect(result).toEqual({
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['identity'],
      });
    });
  });

  describe('finalize', () => {
    it('should finalize signup and return actor/workspace info', async () => {
      const sessionId = uuidv4();
      const actorId = uuidv4();
      const workspaceId = uuidv4();

      mockCommandBus.execute.mockResolvedValue({ actorId, workspaceId });

      const result = await controller.finalize(sessionId, { sessionId });

      expect(result).toEqual({ actorId, workspaceId });
    });
  });

  describe('findOne', () => {
    it('should return session DTO if found', async () => {
      const sessionId = uuidv4();
      const now = new Date();
      const workspaceId = uuidv4();

      const queryResult = {
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Rider,
        workspaceId,
        roles: ['Rider'],
        linkedWallets: [],
        completedSteps: ['init'],
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
      };

      mockQueryBus.execute.mockResolvedValue(queryResult);

      const result = await controller.findOne(sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.status).toBe(SignUpSessionStatus.PARTIAL);
      expect(mockQueryBus.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException if session not found', async () => {
      const sessionId = uuidv4();
      mockQueryBus.execute.mockRejectedValue(
        new NotFoundException(`SignUp session ${sessionId} not found`),
      );

      await expect(controller.findOne(sessionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
