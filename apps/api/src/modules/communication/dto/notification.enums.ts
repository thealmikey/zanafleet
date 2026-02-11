/**
 * Notification Channel Enum
 * Defines the delivery channels for notifications
 */
export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

/**
 * Notification Status Enum
 * Defines the lifecycle states of a notification
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Recipient Type Enum
 * Defines the types of recipients for notifications
 */
export enum RecipientType {
  RIDER = 'RIDER',
  BUSINESS = 'BUSINESS',
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SACCO = 'SACCO',
  ACTOR = 'ACTOR',
}
