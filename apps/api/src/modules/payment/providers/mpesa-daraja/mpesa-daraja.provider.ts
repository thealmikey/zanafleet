import { Injectable, Logger } from '@nestjs/common';

import { PaymentFlowType } from '../../dto/payment.enums';
import {
  PaymentCaptureResult,
  PaymentInitiationResult,
  PaymentIntentData,
  PaymentStatus,
  ProviderCapability,
  RefundResult,
  WebhookProcessingResult,
} from '../dto/payment-provider.types';
import { PaymentProvider } from '../payment-provider.interface';

import { MpesaTransactionType } from './dto/mpesa.types';
import { MpesaDarajaService } from './mpesa-daraja.service';

/**
 * MpesaDarajaProvider
 *
 * Implements PaymentProvider for M-Pesa Daraja API
 * Supports:
 * - C2B (STK Push - Lipa Na M-Pesa)
 * - B2B (Business to Business)
 * - B2C (Business to Customer - disbursements)
 * - C2C (Peer-to-Peer)
 * - Reversals (refunds)
 */
@Injectable()
export class MpesaDarajaProvider implements PaymentProvider {
  readonly providerId = 'mpesa-daraja';
  readonly displayName = 'M-Pesa Daraja';
  readonly supportedCurrencies = ['KES'];
  readonly capabilities: ProviderCapability[] = ['MOBILE_MONEY'];

  private readonly logger = new Logger(MpesaDarajaProvider.name);

  constructor(private readonly mpesaService: MpesaDarajaService) {}

  /**
   * Initiate payment based on flow type
   * Supports C2B, B2B, B2C, C2C
   */
  async initiatePayment(intent: PaymentIntentData): Promise<PaymentInitiationResult> {
    const flowType = (intent.metadata?.flowType as PaymentFlowType) || PaymentFlowType.C2B;
    const phoneNumber = (intent.metadata?.phoneNumber as string) || '';
    const accountReference =
      (intent.metadata?.accountReference as string) || intent.idempotencyKey || 'default';

    this.logger.log(`Initiating M-Pesa payment: ${flowType} - ${intent.amount}`);

    try {
      switch (flowType) {
        case PaymentFlowType.C2B:
          return await this.initiateC2B(intent, phoneNumber, accountReference);

        case PaymentFlowType.B2B:
          return await this.initiateB2B(intent, accountReference);

        case PaymentFlowType.B2C:
          return await this.initiateB2C(intent, phoneNumber, accountReference);

        case PaymentFlowType.C2C:
          return await this.initiateC2C(intent, phoneNumber, accountReference);

        default:
          // Default to C2B (STK Push)
          return await this.initiateC2B(intent, phoneNumber, accountReference);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Payment initiation failed: ${err.message}`);
      return {
        success: false,
        transactionId: `mpesa_${Date.now()}`,
        status: PaymentStatus.FAILED,
        errorCode: 'INITIATION_FAILED',
        errorMessage: err.message,
      };
    }
  }

  /**
   * C2B - Customer to Business (STK Push / Lipa Na M-Pesa)
   */
  private async initiateC2B(
    intent: PaymentIntentData,
    phoneNumber: string,
    accountReference: string
  ): Promise<PaymentInitiationResult> {
    const response = await this.mpesaService.initiateStkPush({
      phoneNumber,
      amount: intent.amount,
      accountReference,
      transactionDesc: (intent.metadata?.description as string) || 'Payment',
    });

    return {
      success: response.ResponseCode === '0',
      transactionId: response.CheckoutRequestID,
      status: response.ResponseCode === '0' ? PaymentStatus.PENDING : PaymentStatus.FAILED,
      providerReference: response.MerchantRequestID,
      metadata: {
        merchantRequestId: response.MerchantRequestID,
        checkoutRequestId: response.CheckoutRequestID,
      },
      errorCode: response.ResponseCode !== '0' ? response.ResponseCode : undefined,
      errorMessage: response.ResponseCode !== '0' ? response.ResponseDescription : undefined,
    };
  }

  /**
   * B2B - Business to Business
   */
  private async initiateB2B(
    intent: PaymentIntentData,
    accountReference: string
  ): Promise<PaymentInitiationResult> {
    const receiverShortCode = (intent.metadata?.receiverShortCode as string) || '';

    const response = await this.mpesaService.sendB2B({
      receiverShortCode,
      amount: intent.amount,
      accountReference,
      transactionDesc: (intent.metadata?.description as string) || 'B2B Payment',
      commandID: MpesaTransactionType.B2B,
      initiator: '',
      securityCredential: '',
    });

    return {
      success: response.ResponseCode === '0',
      transactionId: response.ConversationID,
      status: response.ResponseCode === '0' ? PaymentStatus.PENDING : PaymentStatus.FAILED,
      providerReference: response.OriginatorConversationID,
      errorCode: response.ResponseCode !== '0' ? response.ResponseCode : undefined,
      errorMessage: response.ResponseCode !== '0' ? response.ResponseDescription : undefined,
    };
  }

  /**
   * B2C - Business to Customer (disbursements)
   */
  private async initiateB2C(
    intent: PaymentIntentData,
    phoneNumber: string,
    accountReference: string
  ): Promise<PaymentInitiationResult> {
    const commandType = (intent.metadata?.commandType as string) || 'BusinessPayment';

    const response = await this.mpesaService.sendB2C({
      phoneNumber,
      amount: intent.amount,
      accountReference,
      transactionDesc: (intent.metadata?.description as string) || 'Disbursement',
      commandID: commandType,
      occasion: intent.metadata?.occasion as string,
    });

    return {
      success: response.ResponseCode === '0',
      transactionId: response.ConversationID,
      status: response.ResponseCode === '0' ? PaymentStatus.PENDING : PaymentStatus.FAILED,
      providerReference: response.OriginatorConversationID,
      errorCode: response.ResponseCode !== '0' ? response.ResponseCode : undefined,
      errorMessage: response.ResponseCode !== '0' ? response.ResponseDescription : undefined,
    };
  }

  /**
   * C2C - Peer-to-Peer
   */
  private async initiateC2C(
    intent: PaymentIntentData,
    phoneNumber: string,
    accountReference: string
  ): Promise<PaymentInitiationResult> {
    const response = await this.mpesaService.sendC2C({
      phoneNumber,
      amount: intent.amount,
      accountReference,
      transactionDesc: (intent.metadata?.description as string) || 'P2P Transfer',
    });

    return {
      success: response.success,
      transactionId: response.transactionId || `c2c_${Date.now()}`,
      status: response.success ? PaymentStatus.PENDING : PaymentStatus.FAILED,
      providerReference: response.conversationId,
      errorCode: !response.success ? 'C2C_FAILED' : undefined,
      errorMessage: !response.success ? 'C2C transfer failed' : undefined,
    };
  }

  /**
   * Capture/verify payment - M-Pesa handles this via callbacks
   */
  async capturePayment(transactionId: string): Promise<PaymentCaptureResult> {
    // For M-Pesa, we need to query the transaction status
    // This is typically done via callbacks, but we can also query manually
    try {
      const status = await this.mpesaService.queryTransactionStatus({
        transactionId,
        identifierType: 1,
        remarks: 'Verifying payment',
      });

      const isSuccessful =
        status.Transaction?.TransactionStatus === 'Completed' ||
        status.Transaction?.TransactionStatus === 'Success';

      return {
        success: isSuccessful,
        transactionId,
        status: isSuccessful ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
        capturedAmount: isSuccessful ? Number(status.Transaction?.Amount) : undefined,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        transactionId,
        status: PaymentStatus.FAILED,
        errorCode: 'CAPTURE_FAILED',
        errorMessage: err.message,
      };
    }
  }

  /**
   * Refund - Reverse a transaction
   */
  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    try {
      const response = await this.mpesaService.reverseTransaction({
        transactionId,
        amount,
        receiverParty: '',
        receiverIdentifierType: 1,
        remarks: 'Refund processed via platform',
      });

      const success = response.ResponseCode === '0';

      return {
        success,
        refundId: response.ConversationID || `refund_${Date.now()}`,
        transactionId,
        amount,
        status: success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
        errorCode: !success ? response.ResponseCode : undefined,
        errorMessage: !success ? response.ResponseDescription : undefined,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        refundId: `refund_${Date.now()}`,
        transactionId,
        amount,
        status: PaymentStatus.FAILED,
        errorCode: 'REFUND_FAILED',
        errorMessage: err.message,
      };
    }
  }

  /**
   * Verify webhook/callback signature
   */
  verifyWebhook(payload: unknown, signature: string): boolean {
    return this.mpesaService.verifyCallbackSignature(payload, signature);
  }

  /**
   * Handle M-Pesa callback/webhook
   */
  async handleWebhook(payload: unknown): Promise<WebhookProcessingResult> {
    try {
      const callback = this.mpesaService.parseCallback(payload);
      const transaction = this.mpesaService.extractTransactionFromCallback(callback);

      if (!transaction) {
        return {
          acknowledged: true,
          eventType: 'transaction_failed',
          status: PaymentStatus.FAILED,
        };
      }

      return {
        acknowledged: true,
        eventType: 'transaction_success',
        transactionId: transaction.transactionId,
        status: PaymentStatus.SUCCEEDED,
        metadata: {
          amount: transaction.amount,
          phoneNumber: transaction.phoneNumber,
          accountReference: transaction.accountReference,
        },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Webhook processing failed: ${err.message}`);
      return {
        acknowledged: false,
        eventType: 'error',
        errorMessage: err.message,
      };
    }
  }
}

/**
 * Injection token for M-Pesa provider
 */
export const MPESA_PROVIDER = Symbol('MPESA_PROVIDER');
