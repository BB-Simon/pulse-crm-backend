import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { TeamAnalyticsService } from './team-analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [TeamAnalyticsService],
})
export class AnalyticsModule {}
