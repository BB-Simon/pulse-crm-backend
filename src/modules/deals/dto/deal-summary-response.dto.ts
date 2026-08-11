import { ApiProperty } from '@nestjs/swagger';

export class DealSummaryResponseDto {
  @ApiProperty({
    example:
      "This deal has moved quickly through the pipeline: after an initial call two weeks ago, Jane requested pricing and has been actively engaged, replying to emails same-day. The proposal was sent last week and she's now asking about contract terms, suggesting she's close to a decision.",
  })
  summary: string;
}
