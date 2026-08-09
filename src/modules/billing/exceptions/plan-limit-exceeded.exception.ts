import { HttpException, HttpStatus } from '@nestjs/common';
import { PlanLimitResource } from '../plan-limit-resource.enum';

export class PlanLimitExceededException extends HttpException {
  constructor(
    public readonly resource: PlanLimitResource,
    message: string,
  ) {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
