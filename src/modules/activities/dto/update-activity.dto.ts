import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';

export class UpdateActivityDto extends PartialType(
  OmitType(CreateActivityDto, ['contactId'] as const),
) {}
