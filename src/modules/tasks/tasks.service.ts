import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Task } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { OrgMembershipService } from '../../common/services/org-membership.service';
import { ContactsService } from '../contacts/contacts.service';
import { DealsService } from '../deals/deals.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MyTasksQueryDto } from './dto/my-tasks-query.dto';
import { TaskListResponseDto } from './dto/task-list-response.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMembership: OrgMembershipService,
    private readonly contactsService: ContactsService,
    private readonly dealsService: DealsService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: TaskQueryDto,
  ): Promise<TaskListResponseDto> {
    const where: Prisma.TaskWhereInput = {
      organizationId: user.organizationId,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.completed !== undefined ? { completed: query.completed } : {}),
      ...this.resolveAssigneeFilter(user, query.assigneeId),
    };
    return this.paginate(where, query);
  }

  async myTasks(
    user: AuthenticatedUser,
    query: MyTasksQueryDto,
  ): Promise<TaskListResponseDto> {
    const where: Prisma.TaskWhereInput = {
      organizationId: user.organizationId,
      assigneeId: user.id,
      ...(query.completed !== undefined ? { completed: query.completed } : {}),
    };
    return this.paginate(where, query);
  }

  async overdueTasks(
    user: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<TaskListResponseDto> {
    const where: Prisma.TaskWhereInput = {
      organizationId: user.organizationId,
      completed: false,
      dueDate: { lt: new Date() },
      ...this.resolveAssigneeFilter(user, undefined),
    };
    return this.paginate(where, query);
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<TaskResponseDto> {
    const task = await this.getVisibleOrThrow(user, id);
    return this.toResponseDto(task);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const assigneeId = await this.orgMembership.resolveOwnerId(
      user,
      dto.assigneeId,
    );

    if (dto.contactId) {
      await this.contactsService.findOne(user, dto.contactId);
    }
    if (dto.dealId) {
      await this.dealsService.findOne(user, dto.dealId);
    }

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        assigneeId,
        contactId: dto.contactId,
        dealId: dto.dealId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });
    return this.toResponseDto(task);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const existing = await this.getVisibleOrThrow(user, id);

    let assigneeId: string | undefined;
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== existing.assigneeId
    ) {
      if (user.role === Role.REP) {
        throw new ForbiddenException('Reps cannot reassign tasks');
      }
      assigneeId = await this.orgMembership.assertUserInOrg(
        user.organizationId,
        dto.assigneeId,
      );
    }

    if (dto.contactId) {
      await this.contactsService.findOne(user, dto.contactId);
    }
    if (dto.dealId) {
      await this.dealsService.findOne(user, dto.dealId);
    }

    let completedAt: Date | null | undefined;
    if (dto.completed !== undefined && dto.completed !== existing.completed) {
      completedAt = dto.completed ? new Date() : null;
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: new Date(dto.dueDate) }
          : {}),
        ...(dto.contactId !== undefined ? { contactId: dto.contactId } : {}),
        ...(dto.dealId !== undefined ? { dealId: dto.dealId } : {}),
        ...(dto.completed !== undefined ? { completed: dto.completed } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        ...(assigneeId !== undefined ? { assigneeId } : {}),
      },
    });
    return this.toResponseDto(task);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    await this.getVisibleOrThrow(user, id);
    await this.prisma.task.delete({ where: { id } });
  }

  private async paginate(
    where: Prisma.TaskWhereInput,
    query: PaginationQueryDto,
  ): Promise<TaskListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [rows, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: rows.map((task) => this.toResponseDto(task)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async getVisibleOrThrow(
    user: AuthenticatedUser,
    id: string,
  ): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...this.resolveAssigneeFilter(user, undefined),
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private resolveAssigneeFilter(
    user: AuthenticatedUser,
    assigneeId?: string,
  ): Prisma.TaskWhereInput {
    if (user.role === Role.REP) {
      return { assigneeId: user.id };
    }
    return assigneeId ? { assigneeId } : {};
  }

  private toResponseDto(task: Task): TaskResponseDto {
    return {
      id: task.id,
      organizationId: task.organizationId,
      assigneeId: task.assigneeId,
      contactId: task.contactId,
      dealId: task.dealId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      completed: task.completed,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
