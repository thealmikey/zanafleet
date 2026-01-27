import { NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { DebitWalletCommand } from '../../commands/debit-wallet.command';
import { WalletEntity } from '../../entities/wallet.entity';
import { WalletDebitedEventV1 } from '../../events/wallet-debited.event';
import { DebitWalletCommandHandler } from '../../handlers/debit-wallet.handler';
import { InsufficientFundsException } from '../../exceptions/insufficient-funds.exception';

describe('DebitWalletCommandHandler', () => {
  let handler: DebitWalletCommandHandler;
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

    handler = new DebitWalletCommandHandler(walletRepository, eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should debit wallet, persist it, emit event, and return new balance', async () => {
      const command = new DebitWalletCommand({
        walletId: 'wallet-123',
        amount: 60,
        reference: 'Order-789',
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
      expect(newBalance).toBe(40);
      expect(wallet.balance).toBe('40.00');
      expect(walletRepository.save).toHaveBeenCalledWith(wallet);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);

      const emittedEvent = eventBus.publish.mock.calls[0][0] as WalletDebitedEventV1;
      expect(emittedEvent).toBeInstanceOf(WalletDebitedEventV1);
      expect(emittedEvent.walletId).toBe(command.walletId);
      expect(emittedEvent.amount).toBe(command.amount);
      expect(emittedEvent.newBalance).toBe(newBalance);
      expect(emittedEvent.reference).toBe(command.reference);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      const command = new DebitWalletCommand({
        walletId: 'wallet-missing',
        amount: 10,
      });

      walletRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should throw InsufficientFundsException when balance is too low', async () => {
      const command = new DebitWalletCommand({
        walletId: 'wallet-low',
        amount: 100,
      });

      const wallet = {
        id: command.walletId,
        balance: '25.00',
      } as WalletEntity;

      walletRepository.findOne.mockResolvedValue(wallet);

      await expect(handler.execute(command)).rejects.toThrow(InsufficientFundsException);
      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
