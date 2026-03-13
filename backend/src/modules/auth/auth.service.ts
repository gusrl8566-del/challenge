import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Admin } from '../../entities/admin.entity';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(dto: AdminLoginDto): Promise<{
    access_token: string;
    token_type: 'Bearer';
    expires_in: string;
    admin: { id: string; email: string; role: string };
  }> {
    const admin = dto.email
      ? await this.adminsRepository.findOne({ where: { email: dto.email } })
      : (
          await this.adminsRepository.find({
            order: { createdAt: 'ASC' },
            take: 1,
          })
        )[0] || null;

    if (!admin) {
      throw new UnauthorizedException('Admin email not found');
    }

    const superCode = this.configService.get<string>('ADMIN_SUPER_CODE');
    if (!superCode) {
      throw new InternalServerErrorException(
        'ADMIN_SUPER_CODE is not configured',
      );
    }

    if (dto.super_code !== superCode) {
      throw new UnauthorizedException('Invalid super code');
    }

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async validateAdminById(id: string): Promise<Admin | null> {
    return this.adminsRepository.findOne({ where: { id } });
  }
}
