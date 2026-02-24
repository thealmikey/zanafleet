/**
 * M-Pesa Daraja API Types
 * TypeScript definitions for M-Pesa Daraja API 2.0
 */

export enum MpesaEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

export enum MpesaTransactionType {
  /** Customer paying to business (Lipa Na M-Pesa) */
  STK_PUSH = 'CustomerPayBillOnline',
  /** Business to Business */
  B2B = 'BusinessPayBill',
  /** Business to Customer (disbursements) */
  B2C = 'BusinessPayment',
  /** Customer to Business (paybill) */
  C2B = 'PayBill',
  /** Customer to Customer */
  C2C = 'CustomerBuyGoodsOnline',
}

export enum MpesaCallbackStatus {
  SUCCESS = 'Success',
  FAILED = 'Failed',
}

/**
 * M-Pesa API Configuration
 */
export interface MpesaConfig {
  environment: MpesaEnvironment;
  shortCode: string;
  initiatorName: string;
  initiatorPassword: string;
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
  timeoutUrl: string;
  /** For B2C - threshold for requiring validation */
  validationUrl?: string;
  /** For B2C - confirmation URL */
  confirmationUrl?: string;
}

/**
 * STK Push (Lipa Na M-Pesa) Request
 * Used for C2B - Customer pays Business
 */
export interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callBackUrl?: string;
}

/**
 * STK Push Response
 */
export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

/**
 * STK Push Callback
 */
export interface StkPushCallback {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

/**
 * B2B (Business to Business) Request
 * Platform paying another business
 */
export interface B2BRequest {
  receiverShortCode: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  initiator: string;
  securityCredential: string;
  commandID: string;
}

/**
 * B2B Response
 */
export interface B2BResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

/**
 * B2C (Business to Customer) Request
 * Disbursements - paying riders, customers
 */
export interface B2CRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  commandID: string;
  occasion?: string;
}

/**
 * B2C Response
 */
export interface B2CResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

/**
 * B2C Callback
 */
export interface B2CCallback {
  ResultCode: number;
  ResultDesc: string;
  TransactionID: string;
  ConversationID?: string;
  OriginatorConversationID?: string;
  Result?: {
    ConversationID: string;
    OriginatorConversationID: string;
    ResultCode: number;
    ResultDesc: string;
    TransactionID: string;
    TransactionReceipt: string;
    TransactionStatus: string;
    ReceiverPartyPublicName: string;
    TransactionAmount: number;
    WorkingAccountAvailableFunds: number;
    NumberOfTransaction: string;
    ReceiverParty: string;
    Charges: {
      Name: string;
      Amount: number;
    }[];
    InitatorAccountAvailableFunds: number;
    DebitAccountType: string;
  };
}

/**
 * C2C (Peer-to-Peer) Request
 * User-to-user transfers
 */
export interface C2CRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  /** Primary contact for the sender */
  senderPrimaryContact?: string;
}

/**
 * Transaction Status Query Request
 */
export interface TransactionStatusRequest {
  transactionId: string;
  identifierType: number;
  remarks: string;
  occasion?: string;
}

/**
 * Transaction Status Response
 */
export interface TransactionStatusResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
  TransactionStatus: string;
  ReasonType: string;
  Transaction: {
    Receipt: string;
    TransactionID: string;
    TransactionStatus: string;
    Amount: number;
    TransactionType: string;
    TransactionDesc: string;
    CreateTime: string;
    ConfirmTime: string;
  };
}

/**
 * Reversal Request
 */
export interface ReversalRequest {
  transactionId: string;
  amount: number;
  receiverParty: string;
  receiverIdentifierType: number;
  remarks: string;
  occasion?: string;
}

/**
 * Reversal Response
 */
export interface ReversalResponse {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

/**
 * OAuth Token Response
 */
export interface MpesaAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Generic M-Pesa API Error
 */
export interface MpesaError {
  requestId?: string;
  errorCode?: string;
  errorMessage: string;
}

/**
 * C2B Register URL Request
 */
export interface C2BRegisterUrlRequest {
  validationUrl: string;
  confirmationUrl: string;
  responseType: string;
  shortCode: string;
}

/**
 * C2B Register URL Response
 */
export interface C2BRegisterUrlResponse {
  ConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
  ValidationURL: string;
  ConfirmationURL: string;
  RegistrationID: number;
}

/**
 * C2B Transaction (from callback/confirmation)
 */
export interface C2BTransaction {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: number;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  OrgAccountBalance: string;
  ThirdPartyTransID: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

/**
 * M-Pesa Callback Result
 * Wrapper for all M-Pesa callbacks
 */
export interface MpesaCallbackResult {
  Result: {
    ResultCode: number;
    ResultDesc: string;
    TransactionID?: string;
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Name: string;
        Value: string | number;
      }>;
    };
  };
}
