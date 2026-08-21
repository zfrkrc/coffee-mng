import { Module } from '@nestjs/common';
import { SSOController } from './sso.controller';

@Module({
  controllers: [SSOController],
})
export class AuthModule {}