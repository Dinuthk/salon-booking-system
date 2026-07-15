import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventBusModule } from './events/event-bus.module';
import { SearchModule } from './search/search.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    EventBusModule,
    SearchModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
