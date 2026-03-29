import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

export const SQL = Symbol('SQL');

@Global()
@Module({
  providers: [
    {
      provide: SQL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return postgres(config.get('DATABASE_URL'), {
          max: 10,
          idle_timeout: 30,
          connect_timeout: 10,
        });
      },
    },
  ],
  exports: [SQL],
})
export class DatabaseModule {}
