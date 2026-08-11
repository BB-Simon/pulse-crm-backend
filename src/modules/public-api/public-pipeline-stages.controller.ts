import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentApiKeyOrg } from '../../common/decorators/current-api-key-org.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { PublicPipelineStageResponseDto } from './dto/public-pipeline-stage-response.dto';
import { PublicDealsService } from './public-deals.service';

@ApiTags('public-pipeline-stages')
@ApiHeader({ name: 'X-API-Key', description: 'Your PulseCRM API key' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@Controller('public/v1/pipeline-stages')
export class PublicPipelineStagesController {
  constructor(private readonly publicDealsService: PublicDealsService) {}

  @Get()
  @ApiOperation({
    summary: 'List pipeline stages, ordered (read-only)',
  })
  @ApiOkResponse({ type: [PublicPipelineStageResponseDto] })
  list(
    @CurrentApiKeyOrg() organizationId: string,
  ): Promise<PublicPipelineStageResponseDto[]> {
    return this.publicDealsService.listPipelineStages(organizationId);
  }
}
