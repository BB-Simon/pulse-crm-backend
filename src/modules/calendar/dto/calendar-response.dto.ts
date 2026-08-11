import { ApiProperty } from '@nestjs/swagger';
import { CalendarEventDto } from './calendar-event.dto';

export class CalendarResponseDto {
  @ApiProperty({
    type: [CalendarEventDto],
    description: 'Deals and Tasks merged into one feed, sorted chronologically',
  })
  data: CalendarEventDto[];
}
