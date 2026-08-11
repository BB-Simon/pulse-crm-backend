import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentApiKeyOrg } from '../../common/decorators/current-api-key-org.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { PublicContactListResponseDto } from './dto/public-contact-list-response.dto';
import { PublicContactQueryDto } from './dto/public-contact-query.dto';
import { PublicContactResponseDto } from './dto/public-contact-response.dto';
import { PublicCreateContactDto } from './dto/public-create-contact.dto';
import { PublicContactsService } from './public-contacts.service';

@ApiTags('public-contacts')
@ApiHeader({ name: 'X-API-Key', description: 'Your PulseCRM API key' })
@ApiUnauthorizedResponse({ description: 'Missing or invalid API key' })
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@Controller('public/v1/contacts')
export class PublicContactsController {
  constructor(private readonly publicContactsService: PublicContactsService) {}

  @Get()
  @ApiOperation({
    summary: 'List contacts (paginated, filterable by tag/owner)',
  })
  @ApiOkResponse({ type: PublicContactListResponseDto })
  list(
    @CurrentApiKeyOrg() organizationId: string,
    @Query() query: PublicContactQueryDto,
  ): Promise<PublicContactListResponseDto> {
    return this.publicContactsService.list(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by id' })
  @ApiOkResponse({ type: PublicContactResponseDto })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  findOne(
    @CurrentApiKeyOrg() organizationId: string,
    @Param('id') id: string,
  ): Promise<PublicContactResponseDto> {
    return this.publicContactsService.findOne(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  @ApiCreatedResponse({ type: PublicContactResponseDto })
  @ApiNotFoundResponse({
    description: 'Company or owner not found in this organization',
  })
  @ApiResponse({
    status: HttpStatus.PAYMENT_REQUIRED,
    description:
      'Contact limit reached for the current plan — upgrade required',
  })
  create(
    @CurrentApiKeyOrg() organizationId: string,
    @Body() dto: PublicCreateContactDto,
  ): Promise<PublicContactResponseDto> {
    return this.publicContactsService.create(organizationId, dto);
  }
}
