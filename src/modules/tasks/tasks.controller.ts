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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { TaskListResponseDto } from './dto/task-list-response.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('my')
  @ApiOperation({ summary: "List the current user's tasks (paginated)" })
  @ApiOkResponse({ type: TaskListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  myTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyTasksQueryDto,
  ): Promise<TaskListResponseDto> {
    return this.tasksService.myTasks(user, query);
  }

  @Get('overdue')
  @ApiOperation({
    summary:
      'List incomplete tasks past their due date. Reps see only their own; Managers/Admins see the whole organization.',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  overdueTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<TaskListResponseDto> {
    return this.tasksService.overdueTasks(user, query);
  }

  @Get()
  @ApiOperation({
    summary:
      'List tasks (paginated, filterable by assignee/contact/deal/completed). Reps only see their own tasks.',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TaskQueryDto,
  ): Promise<TaskListResponseDto> {
    return this.tasksService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Contact, deal, or assignee not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a task, including toggling completed (sets/clears completedAt)',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Reps cannot reassign tasks' })
  @ApiNotFoundResponse({
    description: 'Task, contact, deal, or assignee not found',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasksService.remove(user, id);
  }
}
