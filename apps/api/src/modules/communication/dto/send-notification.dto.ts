import { z } from 'zod';
import { NotificationChannel, RecipientType } from './notification.enums';

/**
 * Zod schema for validating SendNotificationDto
 */
export const SendNotificationDtoSchema = z.object({
  recipientId: z.string().uuid().describe('The ID of the notification recipient'),
  recipientType: z
    .nativeEnum(RecipientType)
    .describe('The type of recipient (actor, rider, or business)'),
  channel: z
    .nativeEnum(NotificationChannel)
    .describe('The communication channel to use'),
  templateId: z.string().min(1).describe('The ID of the notification template to render'),
  variables: z
    .record(z.string(), z.any())
    .optional()
    .default({})
    .describe('Template variables for rendering'),
  correlationId: z
    .string()
    .uuid()
    .optional()
    .describe('Correlation ID for tracing across services'),
  workspaceId: z.string().uuid().describe('The workspace ID for context'),
});

/**
 * Type definition for SendNotificationDto
 */
export type SendNotificationDto = z.infer<typeof SendNotificationDtoSchema>;

/**
 * Validates and parses a SendNotificationDto
 */
export function validateSendNotificationDto(data: unknown): SendNotificationDto {
  return SendNotificationDtoSchema.parse(data);
}
