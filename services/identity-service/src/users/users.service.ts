import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountStatus, User } from './user.entity';
import { UserRole } from '../common/roles.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    phone?: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
    status?: AccountStatus;
  }): Promise<User> {
    const user = this.repo.create({
      ...data,
      email: data.email.toLowerCase(),
      role: data.role ?? UserRole.CUSTOMER,
      status: data.status ?? AccountStatus.ACTIVE,
    });
    return this.repo.save(user);
  }

  findOwners(): Promise<User[]> {
    return this.repo.find({ where: { role: UserRole.OWNER }, order: { createdAt: 'DESC' } });
  }

  findAdmins(): Promise<User[]> {
    return this.repo.find({ where: { role: UserRole.ADMIN } });
  }

  async setStatus(id: string, status: AccountStatus): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    user.status = status;
    return this.repo.save(user);
  }
}
