import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { AiStationController } from './ai-station.controller';
import { AiStationService } from './ai-station.service';
import { AiUsageService } from './ai-usage.service';
import { AiGatewayClient } from './ai-gateway.client';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [CustomerModule, AccessModule],
  controllers: [AiStationController],
  providers: [AiStationService, AiUsageService, AiGatewayClient],
})
export class AiStationModule {}
