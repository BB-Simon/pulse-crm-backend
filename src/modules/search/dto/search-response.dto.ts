import { ApiProperty } from '@nestjs/swagger';
import { SearchContactResultDto } from './search-contact-result.dto';
import { SearchDealResultDto } from './search-deal-result.dto';

export class SearchResponseDto {
  @ApiProperty({ type: [SearchContactResultDto] })
  contacts: SearchContactResultDto[];

  @ApiProperty({ type: [SearchDealResultDto] })
  deals: SearchDealResultDto[];
}
