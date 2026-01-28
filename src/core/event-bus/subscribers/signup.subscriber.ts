import { Injectable, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  NatsContext,
  Payload,
} from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';

/**
 * SignUpSubscriber
 *
 * NATS message handler for signup domain events.
 */
@Injectable()
export class SignUpSubscriber {
  private readonly logger = new Logger(SignUpSubscriber.name);

  @MessagePattern(NatsSubjects.SignUp.ALL)
  handleSignUpEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): void {
    const subject = context.getSubject();
    this.logger.log(
      `Received SignUp event: ${data.eventType} on subject: ${subject}`,
    );
  }
}
