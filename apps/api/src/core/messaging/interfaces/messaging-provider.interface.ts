import { MessagePayload, SendResult } from './message-payload.interface';

export interface MessagingProvider {
  send(message: MessagePayload): Promise<SendResult>;
}
