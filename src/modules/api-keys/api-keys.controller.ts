import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { ApiKeysService } from './api-keys.service';
import { ApiKeyCreatedResponseDto } from './dto/api-key-created-response.dto';
import { ApiKeyListResponseDto } from './dto/api-key-list-response.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({
    summary:
      "List the organization's API keys (masked — full key never shown again) (Admin only)",
  })
  @ApiOkResponse({ type: ApiKeyListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage API keys' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<ApiKeyListResponseDto> {
    return this.apiKeysService.list(user, query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Generate an API key for the public API (Admin only). The full key is returned ONLY in this response — store it, it cannot be retrieved again.',
  })
  @ApiCreatedResponse({ type: ApiKeyCreatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage API keys' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeysService.create(user, dto);
  }

  @Post(':id/revoke')
  @ApiOperation({
    summary:
      'Revoke an API key (Admin only). Idempotent — revoking an already-revoked key is a no-op.',
  })
  @ApiOkResponse({ type: ApiKeyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can manage API keys' })
  @ApiNotFoundResponse({ description: 'API key not found' })
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.revoke(user, id);
  }
}
