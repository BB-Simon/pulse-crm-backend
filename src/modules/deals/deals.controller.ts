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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DealSummaryService } from './deal-summary.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { DealListResponseDto } from './dto/deal-list-response.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { DealResponseDto } from './dto/deal-response.dto';
import { DealSummaryResponseDto } from './dto/deal-summary-response.dto';
import { DraftFollowUpResponseDto } from './dto/draft-follow-up-response.dto';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { PipelineStageResponseDto } from './dto/pipeline-stage-response.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealsService } from './deals.service';
import { FollowUpDraftService } from './follow-up-draft.service';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly followUpDraftService: FollowUpDraftService,
    private readonly dealSummaryService: DealSummaryService,
  ) {}

  @Get('pipeline-stages')
  @ApiOperation({
    summary: "List the organization's pipeline stages, in order",
  })
  @ApiOkResponse({ type: [PipelineStageResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  listPipelineStages(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PipelineStageResponseDto[]> {
    return this.dealsService.listPipelineStages(user);
  }

  @Get()
  @ApiOperation({
    summary:
      'List deals (paginated, filterable by stage/status/owner). Reps only see their own deals.',
  })
  @ApiOkResponse({ type: DealListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DealQueryDto,
  ): Promise<DealListResponseDto> {
    return this.dealsService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deal by id' })
  @ApiOkResponse({ type: DealResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Deal not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DealResponseDto> {
    return this.dealsService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a deal' })
  @ApiCreatedResponse({ type: DealResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({
    description: 'Contact, company, owner, or pipeline stage not found',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDealDto,
  ): Promise<DealResponseDto> {
    return this.dealsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deal' })
  @ApiOkResponse({ type: DealResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Reps cannot reassign deal ownership' })
  @ApiNotFoundResponse({
    description: 'Deal, contact, company, or owner not found',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ): Promise<DealResponseDto> {
    return this.dealsService.update(user, id, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({
    summary:
      'Move a deal to a different pipeline stage (e.g. Kanban drag-and-drop). Automatically sets status/closedAt when the target stage is a Won/Lost stage.',
  })
  @ApiOkResponse({ type: DealResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Deal or pipeline stage not found' })
  moveStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveDealStageDto,
  ): Promise<DealResponseDto> {
    return this.dealsService.moveStage(user, id, dto);
  }

  @Post(':id/draft-followup')
  @ApiOperation({
    summary:
      "Draft a follow-up email for this deal via Claude, based on the contact's info, recent activity, and the deal's stage. Not persisted — edit as needed, then log it yourself via POST /activities.",
  })
  @ApiOkResponse({ type: DraftFollowUpResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Deal not found' })
  draftFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DraftFollowUpResponseDto> {
    return this.followUpDraftService.draftFollowUp(user, id);
  }

  @Post(':id/summary')
  @ApiOperation({
    summary:
      'Summarize this deal\'s full activity history into a short "catch me up" paragraph via Claude, for the top of the Deal detail view.',
  })
  @ApiOkResponse({ type: DealSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Deal not found' })
  summarizeDeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DealSummaryResponseDto> {
    return this.dealSummaryService.summarizeDeal(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a deal' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Deal not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.dealsService.remove(user, id);
  }
}
