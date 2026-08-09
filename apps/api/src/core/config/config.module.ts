/**
 * Centralized configuration provider for the API process.
 *
 * Loads and validates environment variables against @cafeos/config schemas at
 * startup so misconfigurations fail fast with a readable error instead of
 * surfacing as unrelated runtime failures.
 */
import { Global, Module } from '@nestjs/common';
import { loadConfig, apiEnvSchema, type ApiEnv } from '@cafeos/config';

export const API_ENV = Symbol('API_ENV');

@Global()
@Module({
  providers: [
    {
      provide: API_ENV,
      useFactory: (): ApiEnv => loadConfig(apiEnvSchema),
    },
  ],
  exports: [API_ENV],
})
export class ConfigModule {}
