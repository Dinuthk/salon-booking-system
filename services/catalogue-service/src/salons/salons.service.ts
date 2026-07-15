import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Salon, SalonDocument } from './schemas/salon.schema';
import { CreateSalonDto } from './dto/create-salon.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class SalonsService {
  constructor(
    @InjectModel(Salon.name) private readonly model: Model<SalonDocument>,
    private readonly bus: EventBusService,
  ) {}

  async create(ownerId: string, dto: CreateSalonDto): Promise<SalonDocument> {
    const salon = await this.model.create({
      ownerId,
      name: dto.name,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      phone: dto.phone,
      photos: dto.photos ?? [],
      location: dto.location
        ? { type: 'Point', coordinates: [dto.location.lng, dto.location.lat] }
        : undefined,
      // NOTE: real flow keeps salons 'pending' until the Admin service verifies
      // them. That service is out of this vertical slice, so we auto-activate to
      // keep the booking path demoable end-to-end.
      status: 'active',
    });
    this.emitUpserted(salon);
    return salon;
  }

  async findAll(): Promise<SalonDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  async findByOwner(ownerId: string): Promise<SalonDocument[]> {
    return this.model.find({ ownerId }).exec();
  }

  async findOne(id: string): Promise<SalonDocument> {
    const salon = await this.model.findById(id).exec();
    if (!salon) throw new NotFoundException('Salon not found');
    return salon;
  }

  async addService(
    ownerId: string,
    salonId: string,
    dto: CreateServiceDto,
  ): Promise<SalonDocument> {
    const salon = await this.assertOwned(ownerId, salonId);
    salon.services.push({
      name: dto.name,
      category: dto.category ?? 'General',
      description: dto.description,
      durationMinutes: dto.durationMinutes,
      price: dto.price,
      bufferMinutes: dto.bufferMinutes ?? 0,
      assignedStaffIds: dto.assignedStaffIds ?? [],
      active: true,
    } as any);
    await salon.save();
    this.emitUpserted(salon);
    return salon;
  }

  async setStatus(
    salonId: string,
    status: 'pending' | 'active' | 'suspended',
  ): Promise<SalonDocument> {
    const salon = await this.findOne(salonId);
    salon.status = status;
    await salon.save();
    this.emitUpserted(salon);
    return salon;
  }

  private async assertOwned(ownerId: string, salonId: string): Promise<SalonDocument> {
    const salon = await this.findOne(salonId);
    if (salon.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this salon');
    }
    return salon;
  }

  /** Publish a denormalized snapshot for the Search read model (CQRS). */
  private emitUpserted(salon: SalonDocument) {
    this.bus.publish('salon.upserted', {
      salonId: salon.id,
      ownerId: salon.ownerId,
      name: salon.name,
      description: salon.description,
      address: salon.address,
      city: salon.city,
      location: salon.location,
      photos: salon.photos,
      status: salon.status,
      ratingAvg: salon.ratingAvg,
      ratingCount: salon.ratingCount,
      services: salon.services.map((s) => ({
        serviceId: s._id.toString(),
        name: s.name,
        category: s.category,
        durationMinutes: s.durationMinutes,
        price: s.price,
        active: s.active,
      })),
    });
  }
}
