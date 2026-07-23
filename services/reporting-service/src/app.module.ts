import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventBusModule } from './events/event-bus.module';
import { ReportingModule } from './reporting/reporting.module';
import { HealthController } from './health/health.controller';
import { EventRecord } from './reporting/event-record.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [EventRecord],
      synchronize: true,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    EventBusModule,
    ReportingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
