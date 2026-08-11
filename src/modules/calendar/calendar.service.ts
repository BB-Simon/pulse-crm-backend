import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarEventDto, CalendarEventType } from './dto/calendar-event.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(
    user: AuthenticatedUser,
    query: CalendarQueryDto,
  ): Promise<CalendarResponseDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }

    const isRep = user.role === Role.REP;

    const [deals, tasks] = await Promise.all([
      this.prisma.deal.findMany({
        where: {
          organizationId: user.organizationId,
          expectedCloseDate: { gte: from, lte: to },
          ...(isRep ? { ownerId: user.id } : {}),
        },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId: user.organizationId,
          dueDate: { gte: from, lte: to },
          ...(isRep ? { assigneeId: user.id } : {}),
        },
      }),
    ]);

    const dealEvents: CalendarEventDto[] = deals.map((deal) => ({
      type: CalendarEventType.DEAL,
      id: deal.id,
      // Non-null: the query above only matches deals with expectedCloseDate
      // in range, which excludes null values.
      date: deal.expectedCloseDate as Date,
      title: deal.title,
      contactId: deal.contactId,
      dealId: deal.id,
      ownerId: deal.ownerId,
      value: Number(deal.value),
      status: deal.status,
      completed: null,
    }));

    const taskEvents: CalendarEventDto[] = tasks.map((task) => ({
      type: CalendarEventType.TASK,
      id: task.id,
      date: task.dueDate,
      title: task.title,
      contactId: task.contactId,
      dealId: task.dealId,
      ownerId: task.assigneeId,
      value: null,
      status: null,
      completed: task.completed,
    }));

    const data = [...dealEvents, ...taskEvents].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    return { data };
  }
}
