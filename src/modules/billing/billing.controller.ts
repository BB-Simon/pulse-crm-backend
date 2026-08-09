import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BillingService } from './billing.service';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PortalSessionResponseDto } from './dto/portal-session-response.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Create a Stripe Checkout session for the organization to subscribe to a plan (Admin only)',
  })
  @ApiCreatedResponse({ type: CheckoutSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage billing' })
  @ApiNotFoundResponse({
    description: 'Organization or subscription not found',
  })
  @ApiBadRequestResponse({
    description: 'The requested plan is not available for checkout',
  })
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.billingService.createCheckoutSession(user, dto);
  }

  @Post('portal-session')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Create a Stripe Billing Portal session for the admin to manage payment method, invoices, or cancel (Admin only)',
  })
  @ApiCreatedResponse({ type: PortalSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage billing' })
  @ApiNotFoundResponse({
    description: 'Organization or subscription not found',
  })
  @ApiBadRequestResponse({
    description: 'This organization has no billing account yet',
  })
  createPortalSession(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortalSessionResponseDto> {
    return this.billingService.createPortalSession(user);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw request body');
    }
    return this.billingService.handleWebhookEvent(req.rawBody, signature);
  }
}
