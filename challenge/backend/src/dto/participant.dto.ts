import { IsString, IsPhoneNumber, MinLength, IsOptional } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  name: string;

  @IsPhoneNumber('KR')
  phone: string;

  @IsString()
  @MinLength(4)
  password: string;
}

export class LoginDto {
  @IsPhoneNumber('KR')
  phone: string;

  @IsString()
  password: string;
}
