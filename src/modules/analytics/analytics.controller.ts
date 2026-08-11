import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TeamAnalyticsService } from './team-analytics.service';
import { TeamAnalyticsQueryDto } from './dto/team-analytics-query.dto';
import { TeamAnalyticsResponseDto } from './dto/team-analytics-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly teamAnalyticsService: TeamAnalyticsService) {}

  @Get('team')
  @ApiOperation({
    summary:
      'Per-team-member metrics — deals closed, revenue, conversion rate, and average deal cycle time, optionally filtered by close date range (Manager/Admin only)',
  })
  @ApiOkResponse({ type: TeamAnalyticsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Reps cannot view team analytics' })
  getTeamAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TeamAnalyticsQueryDto,
  ): Promise<TeamAnalyticsResponseDto> {
    return this.teamAnalyticsService.getTeamAnalytics(
      user.organizationId,
      query,
    );
  }
}
