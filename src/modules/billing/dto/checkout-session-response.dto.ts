import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({
    example: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3',
    description: 'Stripe-hosted Checkout URL to redirect the admin to',
  })
  url: string;

  @ApiProperty({ example: 'cs_test_a1b2c3' })
  sessionId: string;
}
