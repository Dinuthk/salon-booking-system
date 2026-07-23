import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './staff.entity';
import { CreateStaffDto, LeaveDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff) private readonly repo: Repository<Staff>,
  ) {}

  create(ownerId: string, dto: CreateStaffDto): Promise<Staff> {
    return this.repo.save(
      this.repo.create({
        ownerId,
        salonId: dto.salonId,
        name: dto.name,
        title: dto.title ?? 'Stylist',
        skills: dto.skills ?? [],
        workingDays: dto.workingDays ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
        leave: [],
      }),
    );
  }

  // Public: staff for a salon (used when a customer picks a stylist).
  listForSalon(salonId: string): Promise<Staff[]> {
    return this.repo.find({ where: { salonId, active: true } });
  }

  listForOwner(ownerId: string): Promise<Staff[]> {
    return this.repo.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
  }

  private async owned(ownerId: string, id: string): Promise<Staff> {
    const staff = await this.repo.findOne({ where: { id } });
    if (!staff) throw new NotFoundException('Staff not found');
    if (staff.ownerId !== ownerId) throw new ForbiddenException('Not your staff member');
    return staff;
  }

  async update(ownerId: string, id: string, patch: Partial<CreateStaffDto> & { active?: boolean }) {
    const staff = await this.owned(ownerId, id);
    Object.assign(staff, {
      name: patch.name ?? staff.name,
      title: patch.title ?? staff.title,
      skills: patch.skills ?? staff.skills,
      workingDays: patch.workingDays ?? staff.workingDays,
      active: patch.active ?? staff.active,
    });
    return this.repo.save(staff);
  }

  async addLeave(ownerId: string, id: string, leave: LeaveDto) {
    const staff = await this.owned(ownerId, id);
    staff.leave = [...(staff.leave ?? []), leave];
    return this.repo.save(staff);
  }
}
