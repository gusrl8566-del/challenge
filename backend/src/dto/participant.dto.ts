import { IsString, IsPhoneNumber, IsOptional } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}

export class UpdateParticipantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
