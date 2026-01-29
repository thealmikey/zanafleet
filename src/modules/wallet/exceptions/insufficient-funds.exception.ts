import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * InsufficientFundsException
 * Thrown when a debit operation is attempted with an amount greater than the wallet balance
 */
export class InsufficientFundsException extends HttpException {
  constructor(walletId: string, balance: number, requestedAmount: number) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Insufficient Funds',
        message: `Wallet ${walletId} has insufficient funds. Balance: ${balance.toFixed(
          2
        )}, Requested: ${requestedAmount.toFixed(2)}`,
        walletId,
        balance,
        requestedAmount,
      },
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
