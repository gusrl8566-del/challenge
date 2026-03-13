import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
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

export class SubmitInbodyDto {
  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsNumber()
  @Min(0)
  skeletalMuscleMass: number;

  @IsNumber()
  @Min(0)
  bodyFatMass: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
