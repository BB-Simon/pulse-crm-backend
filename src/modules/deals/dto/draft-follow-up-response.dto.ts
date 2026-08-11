import { ApiProperty } from '@nestjs/swagger';

export class DraftFollowUpResponseDto {
  @ApiProperty({ example: 'Following up on our proposal' })
  subject: string;

  @ApiProperty({
    example:
      'Hi Jane,\n\nJust wanted to follow up on the proposal we sent over last week...',
  })
  body: string;
}
