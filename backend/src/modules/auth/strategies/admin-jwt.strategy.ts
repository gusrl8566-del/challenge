import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

type AdminJwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-secret-key-change-in-production',
      ),
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.authService.validateAdminById(payload.sub);

    if (!admin) {
      throw new UnauthorizedException('Admin account not found');
    }

    if (admin.role !== 'admin') {
      throw new UnauthorizedException('Invalid admin role');
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }
}
