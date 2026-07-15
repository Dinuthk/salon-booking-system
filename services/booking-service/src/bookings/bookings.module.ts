import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './booking.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { CatalogueClient } from './catalogue.client';

@Module({
  imports: [TypeOrmModule.forFeature([Booking])],
  controllers: [BookingsController],
  providers: [BookingsService, CatalogueClient],
})
export class BookingsModule {}
