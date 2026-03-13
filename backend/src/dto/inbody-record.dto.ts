import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { InbodyPhase } from '../entities/inbody-record.entity';

export class CreateInbodyRecordDto {
  @IsString()
  participantId: string;

  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  skeletalMuscleMass?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bodyFatMass?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateInbodyRecordDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  skeletalMuscleMass?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bodyFatMass?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
