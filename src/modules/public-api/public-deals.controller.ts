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
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentApiKeyOrg } from '../../common/decorators/current-api-key-org.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { PublicDealListResponseDto } from './dto/public-deal-list-response.dto';
import { PublicDealQueryDto } from './dto/public-deal-query.dto';
import { PublicDealResponseDto } from './dto/public-deal-response.dto';
import { PublicCreateDealDto } from './dto/public-create-deal.dto';
import { PublicDealsService } from './public-deals.service';

@ApiTags('public-deals')
@ApiHeader({ name: 'X-API-Key', description: 'Your PulseCRM API key' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@Controller('public/v1/deals')
export class PublicDealsController {
  constructor(private readonly publicDealsService: PublicDealsService) {}

  @Get()
  @ApiOperation({
    summary: 'List deals (paginated, filterable by stage/status/owner)',
  })
  @ApiOkResponse({ type: PublicDealListResponseDto })
  list(
    @CurrentApiKeyOrg() organizationId: string,
    @Query() query: PublicDealQueryDto,
  ): Promise<PublicDealListResponseDto> {
    return this.publicDealsService.list(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deal by id' })
  @ApiOkResponse({ type: PublicDealResponseDto })
  @ApiNotFoundResponse({ description: 'Deal not found' })
  findOne(
    @CurrentApiKeyOrg() organizationId: string,
    @Param('id') id: string,
  ): Promise<PublicDealResponseDto> {
    return this.publicDealsService.findOne(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a deal' })
  @ApiCreatedResponse({ type: PublicDealResponseDto })
  @ApiNotFoundResponse({
    description:
      'Contact, company, owner, or pipeline stage not found in this organization',
  })
  create(
    @CurrentApiKeyOrg() organizationId: string,
    @Body() dto: PublicCreateDealDto,
  ): Promise<PublicDealResponseDto> {
    return this.publicDealsService.create(organizationId, dto);
  }
}
