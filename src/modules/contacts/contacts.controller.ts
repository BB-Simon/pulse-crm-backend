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
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnforcePlanLimit } from '../../common/decorators/enforce-plan-limit.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanLimitsGuard } from '../../common/guards/plan-limits.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PlanLimitResource } from '../billing/plan-limit-resource.enum';
import { ContactsService } from './contacts.service';
import { ContactListResponseDto } from './dto/contact-list-response.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { LeadScoreResponseDto } from './dto/lead-score-response.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { LeadScoringService } from './lead-scoring.service';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly leadScoringService: LeadScoringService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List contacts (paginated, filterable by tag/owner). Reps only see their own contacts.',
  })
  @ApiOkResponse({ type: ContactListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ContactQueryDto,
  ): Promise<ContactListResponseDto> {
    return this.contactsService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by id' })
  @ApiOkResponse({ type: ContactResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ContactResponseDto> {
    return this.contactsService.findOne(user, id);
  }

  @Post()
  @UseGuards(PlanLimitsGuard)
  @EnforcePlanLimit(PlanLimitResource.CONTACTS)
  @ApiOperation({ summary: 'Create a contact' })
  @ApiCreatedResponse({ type: ContactResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'Company or owner not found in this organization',
  })
  @ApiResponse({
    status: HttpStatus.PAYMENT_REQUIRED,
    description:
      'Contact limit reached for the current plan — upgrade required',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiOkResponse({ type: ContactResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({
    description: 'Reps cannot reassign contact ownership',
  })
  @ApiNotFoundResponse({ description: 'Contact, company, or owner not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.update(user, id, dto);
  }

  @Post(':id/score')
  @ApiOperation({
    summary:
      'Score this contact as a lead (0-100) via Claude, based on their activity history. Cached on the contact; call again to manually re-score.',
  })
  @ApiOkResponse({ type: LeadScoreResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  scoreContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LeadScoreResponseDto> {
    return this.leadScoringService.scoreContact(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.contactsService.remove(user, id);
  }
}
