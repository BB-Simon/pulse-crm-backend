import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EnforcePlanLimit } from '../../common/decorators/enforce-plan-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanLimitsGuard } from '../../common/guards/plan-limits.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PlanLimitResource } from '../billing/plan-limit-resource.enum';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('invite')
  @Roles(Role.ADMIN)
  @UseGuards(PlanLimitsGuard)
  @EnforcePlanLimit(PlanLimitResource.SEATS)
  @ApiOperation({
    summary: 'Invite a teammate to the organization (Admin only)',
  })
  @ApiCreatedResponse({ type: InviteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Only admins can send invites' })
  @ApiConflictResponse({ description: 'A user with this email already exists' })
  @ApiResponse({
    status: HttpStatus.PAYMENT_REQUIRED,
    description: 'Seat limit reached for the current plan — upgrade required',
  })
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteUserDto,
  ): Promise<InviteResponseDto> {
    return this.organizationsService.inviteUser(user, dto);
  }
}
