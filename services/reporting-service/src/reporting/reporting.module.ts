import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventRecord } from './event-record.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EventRecord])],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
