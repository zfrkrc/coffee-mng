import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { AiStationController } from './ai-station.controller';
import { AiStationService } from './ai-station.service';

@Module({
  imports: [CustomerModule],
  controllers: [AiStationController],
  providers: [AiStationService],
})
export class AiStationModule {}
