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
import { CompaniesService } from './companies.service';
import { CompanyListResponseDto } from './dto/company-list-response.dto';
import { CompanyQueryDto } from './dto/company-query.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'List companies in the organization (paginated)' })
  @ApiOkResponse({ type: CompanyListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CompanyQueryDto,
  ): Promise<CompanyListResponseDto> {
    return this.companiesService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by id' })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a company' })
  @ApiCreatedResponse({ type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiOkResponse({ type: CompanyResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.companiesService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Company not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.companiesService.remove(user, id);
  }
}
