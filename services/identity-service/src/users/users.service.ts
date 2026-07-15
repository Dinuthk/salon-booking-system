import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
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
  }): Promise<User> {
    const user = this.repo.create({
      ...data,
      email: data.email.toLowerCase(),
      role: data.role ?? UserRole.CUSTOMER,
    });
    return this.repo.save(user);
  }
}
