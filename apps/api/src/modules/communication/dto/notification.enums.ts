/**
 * Notification Channel Enumeration
 * Defines the supported communication channels for notifications
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

/**
 * Notification Status Enumeration
 * Represents the lifecycle state of a notification
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Recipient Type Enumeration
 * Identifies the type of entity receiving the notification
 */
export enum RecipientType {
  ACTOR = 'actor',
  RIDER = 'rider',
  BUSINESS = 'business',
}
