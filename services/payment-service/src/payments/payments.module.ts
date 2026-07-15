import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockGateway } from './mock-gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockGateway],
})
export class PaymentsModule {}
