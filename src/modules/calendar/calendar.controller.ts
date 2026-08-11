import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CalendarService } from './calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({
    summary:
      'Combined feed of Deals (by expectedCloseDate) and Tasks (by dueDate) within a date range. Reps only see their own; Managers/Admins see the whole organization.',
  })
  @ApiOkResponse({ type: CalendarResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiBadRequestResponse({
    description: '"from" must be before or equal to "to"',
  })
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarResponseDto> {
    return this.calendarService.getCalendar(user, query);
  }
}
