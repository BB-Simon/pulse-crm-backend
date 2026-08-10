import { Global, Module } from '@nestjs/common';
import { OrgMembershipService } from './services/org-membership.service';

@Global()
@Module({
  providers: [OrgMembershipService],
  exports: [OrgMembershipService],
})
export class CommonModule {}
