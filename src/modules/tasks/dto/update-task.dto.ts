import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: 'Mark the task complete/incomplete; sets/clears completedAt',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
