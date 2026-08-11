import { ApiProperty } from '@nestjs/swagger';

export class LeadScoreResponseDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 72 })
  score: number;

  @ApiProperty({
    example:
      'Multiple recent calls and a proposal sent within the last week indicate strong buying intent.',
  })
  rationale: string;

  @ApiProperty()
  scoredAt: Date;
}
