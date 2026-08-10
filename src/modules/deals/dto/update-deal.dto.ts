import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ['pipelineStageId'] as const),
) {}
