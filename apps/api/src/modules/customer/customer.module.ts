import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { TelegramNotifyService } from './telegram-notify.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  controllers: [CustomerController],
  providers: [CustomerService, TelegramNotifyService],
  exports: [CustomerService],
})
export class CustomerModule {}
