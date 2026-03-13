import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsString()
  super_code: string;
}
