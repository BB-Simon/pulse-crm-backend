import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { CurrentApiKeyOrg } from '../../common/decorators/current-api-key-org.decorator';
import { PublicApiMeResponseDto } from './dto/public-api-me-response.dto';

@ApiTags('public-meta')
@ApiHeader({ name: 'X-API-Key', description: 'Your PulseCRM API key' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@Controller('public/v1')
export class PublicApiController {
  @Get('me')
  @ApiOperation({
    summary: 'Verify your API key and see which organization it belongs to',
  })
  @ApiOkResponse({ type: PublicApiMeResponseDto })
  me(@CurrentApiKeyOrg() organizationId: string): PublicApiMeResponseDto {
    return { organizationId };
  }
}
