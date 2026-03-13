import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class CreateParticipantDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^[0-9+\-\s()]+$/)
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  teamName?: string;
}

export class LoginDto {
  @IsString()
  loginId: string;

  @IsString()
  password: string;
}

export class QuickAccessDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  loginId: string;
}
