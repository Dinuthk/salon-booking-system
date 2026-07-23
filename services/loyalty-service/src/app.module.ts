import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventBusModule } from './events/event-bus.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { HealthController } from './health/health.controller';
import { LoyaltyAccount, LoyaltyEntry } from './loyalty/loyalty.entities';

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
      entities: [LoyaltyAccount, LoyaltyEntry],
      synchronize: true,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    EventBusModule,
    LoyaltyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
