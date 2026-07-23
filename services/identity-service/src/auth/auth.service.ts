import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/roles.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  // Seed a platform admin (self-registration can't create admins).
  async onModuleInit() {
    const email = (process.env.ADMIN_EMAIL || 'admin@salon.local').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'admin12345';
    if (await this.users.findByEmail(email)) return;
    await this.users.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      fullName: 'Platform Admin',
      role: UserRole.ADMIN,
    });
    this.logger.log(`Seeded admin account: ${email}`);
  }

  async register(dto: RegisterDto) {
    const role = dto.role ?? UserRole.CUSTOMER;
    if (role !== UserRole.CUSTOMER && role !== UserRole.OWNER) {
      throw new BadRequestException('Only customer or owner accounts can self-register');
    }
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role,
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const claims = { sub: user.id, email: user.email, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(claims, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: parseInt(process.env.JWT_ACCESS_TTL || '900', 10),
      }),
      this.jwt.signAsync({ sub: user.id }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: parseInt(process.env.JWT_REFRESH_TTL || '1209600', 10),
      }),
    ]);
    return {
      accessToken,
      refreshToken,
      user: this.publicProfile(user),
    };
  }

  publicProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }
}
