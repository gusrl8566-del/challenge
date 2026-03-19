import { IsString, IsPhoneNumber, MinLength, IsOptional, MaxLength } from 'class-validator';

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

export class UpdateSponsorDto {
  @IsString()
  @MaxLength(255)
  sponsorName: string;
}
