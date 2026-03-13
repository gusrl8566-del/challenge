import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';

@Controller('auth/admin')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('logout')
  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('validate')
  async validateToken() {
    return {
      valid: true,
    };
  }
}
