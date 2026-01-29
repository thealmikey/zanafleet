// Mock @nestjs/swagger to avoid import errors in test environment
jest.mock(
  '@nestjs/swagger',
  () => ({
    ApiProperty: () => () => {},
    ApiPropertyOptional: () => () => {},
  }),
  { virtual: true }
);

import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { AuthController } from '../../controllers/auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let commandBus: CommandBus;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login and return actor info', async () => {
      const actorId = uuidv4();
      const workspaceId = uuidv4();
      const loginResult = {
        actorId,
        workspaceId,
        type: ActorType.Rider,
      };

      mockCommandBus.execute.mockResolvedValue(loginResult);

      const result = await controller.login({ identifier: 'test-user' });

      expect(result).toEqual(loginResult);
      expect(commandBus.execute).toHaveBeenCalled();
    });

    it('should throw BadRequestException on validation failure', async () => {
      const body = { identifier: '' };

      await expect(controller.login(body as any)).rejects.toThrow(BadRequestException);
    });
  });
});
