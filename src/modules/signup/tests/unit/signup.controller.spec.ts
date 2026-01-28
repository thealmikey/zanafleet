// Mock @nestjs/swagger to avoid import errors in test environment
jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => {},
  ApiPropertyOptional: () => () => {},
}), { virtual: true });

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { SignUpController } from '../../controllers/signup.controller';
import { SignUpSessionStatus } from '../../dto/signup.enums';
import { SignUpSessionEntity } from '../../entities/signup-session.entity';

describe('SignUpController', () => {
  let controller: SignUpController;
  let commandBus: CommandBus;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
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
          provide: getRepositoryToken(SignUpSessionEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<SignUpController>(SignUpController);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiate', () => {
    it('should initiate signup and return session info', async () => {
      const sessionId = uuidv4();
      const expiresAt = new Date();
      const body = { actorType: ActorType.Rider };

      mockCommandBus.execute.mockResolvedValue(sessionId);
      mockRepository.findOne.mockResolvedValue({ id: sessionId, expiresAt });

      const result = await controller.initiate(body);

      expect(result).toEqual({
        sessionId,
        expiresAt: expiresAt.toISOString(),
      });
      expect(commandBus.execute).toHaveBeenCalled();
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
      const session = {
        id: sessionId,
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['identity'],
      };

      mockCommandBus.execute.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(session);

      const result = await controller.updateStep(sessionId, body);

      expect(result).toEqual({
        sessionId,
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['identity'],
      });
    });

    it('should throw NotFoundException if session not found after update', async () => {
      const sessionId = uuidv4();
      mockCommandBus.execute.mockResolvedValue(undefined);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.updateStep(sessionId, { stepName: 'test' }),
      ).rejects.toThrow(NotFoundException);
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
      const entity = {
        id: sessionId,
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Rider,
        workspaceId: uuidv4(),
        roles: ['Rider'],
        linkedWallets: [],
        completedSteps: ['init'],
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
        toDomain: () => ({
          sessionId,
          status: SignUpSessionStatus.PARTIAL,
          actorType: ActorType.Rider,
          workspaceId: entity.workspaceId,
          roles: entity.roles,
          linkedWallets: entity.linkedWallets,
          completedSteps: entity.completedSteps,
          expiresAt: entity.expiresAt,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        }),
      };

      mockRepository.findOne.mockResolvedValue(entity);

      const result = await controller.findOne(sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(result.status).toBe(SignUpSessionStatus.PARTIAL);
    });

    it('should throw NotFoundException if session not found', async () => {
      const sessionId = uuidv4();
      mockRepository.findOne.mockResolvedValue(null);

      await expect(controller.findOne(sessionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
