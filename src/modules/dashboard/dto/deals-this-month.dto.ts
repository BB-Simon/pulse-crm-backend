import { ApiProperty } from '@nestjs/swagger';

export class DealsThisMonthBucketDto {
  @ApiProperty() count: number;
  @ApiProperty({ example: 15000 }) value: number;
}

export class DealsThisMonthDto {
  @ApiProperty({ type: DealsThisMonthBucketDto })
  won: DealsThisMonthBucketDto;

  @ApiProperty({ type: DealsThisMonthBucketDto })
  lost: DealsThisMonthBucketDto;
}
