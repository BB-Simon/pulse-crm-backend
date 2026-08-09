import { ApiProperty } from '@nestjs/swagger';

export class PortalSessionResponseDto {
  @ApiProperty({
    example: 'https://billing.stripe.com/p/session/test_a1b2c3',
    description: 'Stripe-hosted Billing Portal URL to redirect the admin to',
  })
  url: string;
}
