import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionConfig, Dispute } from './admin.entities';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionConfig, Dispute])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
