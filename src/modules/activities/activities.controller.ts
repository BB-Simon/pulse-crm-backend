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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { ActivitiesService } from './activities.service';
import { ActivityListResponseDto } from './dto/activity-list-response.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List activities, ordered chronologically (most recent first). Filterable by contact/deal/type. Reps only see activities on contacts they own.',
  })
  @ApiOkResponse({ type: ActivityListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ActivityQueryDto,
  ): Promise<ActivityListResponseDto> {
    return this.activitiesService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an activity by id' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Log an activity (call/email/meeting/note) against a contact',
  })
  @ApiCreatedResponse({ type: ActivityResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Contact or deal not found' })
  @ApiBadRequestResponse({
    description: 'The given deal does not belong to the given contact',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Activity or deal not found' })
  @ApiBadRequestResponse({
    description: 'The given deal does not belong to the given contact',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.activitiesService.remove(user, id);
  }
}
