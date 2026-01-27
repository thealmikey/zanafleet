import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { CreditWalletCommand } from '../../commands/credit-wallet.command';
import { WalletEntity } from '../../entities/wallet.entity';
import { WalletCreditedEventV1 } from '../../events/wallet-credited.event';
import { CreditWalletCommandHandler } from '../../handlers/credit-wallet.handler';

describe('CreditWalletCommandHandler', () => {
  let handler: CreditWalletCommandHandler;
  let walletRepository: jest.Mocked<Repository<WalletEntity>>;
  let eventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    walletRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<WalletEntity>>;

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    handler = new CreditWalletCommandHandler(walletRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should credit wallet, persist it, emit event, and return new balance', async () => {
      const command = new CreditWalletCommand({
        walletId: 'wallet-123',
        amount: 50,
        reference: 'Order-456',
      });

      const wallet = {
        id: command.walletId,
        balance: '100.00',
      } as WalletEntity;

      walletRepository.findOne.mockResolvedValue(wallet);
      walletRepository.save.mockResolvedValue(wallet);

      const newBalance = await handler.execute(command);

      expect(walletRepository.findOne).toHaveBeenCalledWith({
        where: { id: command.walletId },
      });
      expect(newBalance).toBe(150);
      expect(wallet.balance).toBe('150.00');
      expect(walletRepository.save).toHaveBeenCalledWith(wallet);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);

      const emittedEvent = eventBus.publish.mock.calls[0][0] as WalletCreditedEventV1;
      expect(emittedEvent).toBeInstanceOf(WalletCreditedEventV1);
      expect(emittedEvent.walletId).toBe(command.walletId);
      expect(emittedEvent.amount).toBe(command.amount);
      expect(emittedEvent.newBalance).toBe(newBalance);
      expect(emittedEvent.reference).toBe(command.reference);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      const command = new CreditWalletCommand({
        walletId: 'wallet-unknown',
        amount: 25,
      });

      walletRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
