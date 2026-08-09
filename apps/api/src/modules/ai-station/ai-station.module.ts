import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { AiStationController } from './ai-station.controller';
import { AiStationService } from './ai-station.service';
import { AiUsageService } from './ai-usage.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [CustomerModule, AccessModule],
  controllers: [AiStationController],
  providers: [AiStationService, AiUsageService],
})
export class AiStationModule {}
