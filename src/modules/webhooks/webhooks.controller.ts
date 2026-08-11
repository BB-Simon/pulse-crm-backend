import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookCreatedResponseDto } from './dto/webhook-created-response.dto';
import { WebhookDeliveryListResponseDto } from './dto/webhook-delivery-list-response.dto';
import { WebhookListResponseDto } from './dto/webhook-list-response.dto';
import { WebhookQueryDto } from './dto/webhook-query.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({
    summary: "List the organization's outbound webhooks (Admin only)",
  })
  @ApiOkResponse({ type: WebhookListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WebhookQueryDto,
  ): Promise<WebhookListResponseDto> {
    return this.webhooksService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by id (Admin only)' })
  @ApiOkResponse({ type: WebhookResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.findOne(user, id);
  }

  @Get(':id/deliveries')
  @ApiOperation({
    summary:
      'View the delivery log for a webhook (status, response code, timestamp per attempt), newest first (Admin only)',
  })
  @ApiOkResponse({ type: WebhookDeliveryListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  listDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<WebhookDeliveryListResponseDto> {
    return this.webhooksService.listDeliveries(user, id, query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a webhook (Admin only). The signing secret is returned ONLY in this response — store it, it cannot be retrieved again.',
  })
  @ApiCreatedResponse({ type: WebhookCreatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookCreatedResponseDto> {
    return this.webhooksService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a webhook (Admin only). Cannot change the signing secret.',
  })
  @ApiOkResponse({ type: WebhookResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook (Admin only)' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage webhooks' })
  @ApiNotFoundResponse({ description: 'Webhook not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.webhooksService.remove(user, id);
  }
}
