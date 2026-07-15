import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { SalonsService } from './salons.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { CurrentUser, GatewayUser } from '../common/current-user.decorator';

@Controller('salons')
export class SalonsController {
  constructor(private readonly salons: SalonsService) {}

  // Public: browse all salons
  @Get()
  findAll() {
    return this.salons.findAll();
  }

  // Owner: my salons (must come before :id route)
  @Get('mine/list')
  mine(@CurrentUser() user: GatewayUser) {
    return this.salons.findByOwner(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salons.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: GatewayUser, @Body() dto: CreateSalonDto) {
    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new ForbiddenException('Only salon owners can create salons');
    }
    return this.salons.create(user.id, dto);
  }

  @Post(':id/services')
  addService(
    @CurrentUser() user: GatewayUser,
    @Param('id') id: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.salons.addService(user.id, id, dto);
  }
}
