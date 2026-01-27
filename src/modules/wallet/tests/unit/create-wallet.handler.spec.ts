import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreateWalletCommand } from '../../commands/create-wallet.command';
import { OwnerType, WalletType } from '../../dto/wallet.enums';
import { WalletEntity } from '../../entities/wallet.entity';
import { WalletCreatedEventV1 } from '../../events/wallet-created.event';
import { CreateWalletCommandHandler } from '../../handlers/create-wallet.handler';

describe('CreateWalletCommandHandler', () => {
  let handler: CreateWalletCommandHandler;
  let walletRepository: jest.Mocked<Repository<WalletEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    walletRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<WalletEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreateWalletCommandHandler(walletRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should create wallet, persist it, emit event, and call WalletEntity.fromDomain', async () => {
      const command = new CreateWalletCommand({
        ownerId: 'owner-123',
        ownerType: OwnerType.Actor,
        type: WalletType.Settlement,
        currency: 'USD',
      });

      const fromDomainSpy = jest.spyOn(WalletEntity, 'fromDomain');
      walletRepository.save.mockResolvedValue({} as WalletEntity);

      const walletId = await handler.execute(command);

      expect(walletId).toEqual(expect.any(String));
      expect(fromDomainSpy).toHaveBeenCalledTimes(1);
      expect(fromDomainSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: command.ownerId,
          ownerType: command.ownerType,
          type: command.type,
          currency: command.currency,
          balance: 0,
        }),
      );
      expect(walletRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);

      const emittedEvent = eventBus.publish.mock.calls[0][0] as WalletCreatedEventV1;
      expect(emittedEvent).toBeInstanceOf(WalletCreatedEventV1);
      expect(emittedEvent.walletId).toBe(walletId);
      expect(emittedEvent.ownerId).toBe(command.ownerId);
      expect(emittedEvent.ownerType).toBe(command.ownerType);
      expect(emittedEvent.type).toBe(command.type);
      expect(emittedEvent.currency).toBe(command.currency);
    });
  });
});
