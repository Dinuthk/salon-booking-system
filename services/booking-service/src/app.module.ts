import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventBusModule } from './events/event-bus.module';
import { RedisModule } from './redis/redis.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health/health.controller';
import { Booking } from './bookings/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [Booking],
      synchronize: true,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    EventBusModule,
    RedisModule,
    BookingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
