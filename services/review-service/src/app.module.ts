import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventBusModule } from './events/event-bus.module';
import { ReviewsModule } from './reviews/reviews.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    EventBusModule,
    ReviewsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
