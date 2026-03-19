import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum InbodyPhase {
  BEFORE = 'before',
  AFTER = 'after',
}

export class UploadInbodyImageDto {
  @IsString()
  @MaxLength(255)
  participantId: string;

  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsString()
  @MaxLength(255)
  sponsorName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UploadMultipleImagesDto {
  @IsString()
  @MaxLength(255)
  participantId: string;

  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsString()
  @MaxLength(255)
  sponsorName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
