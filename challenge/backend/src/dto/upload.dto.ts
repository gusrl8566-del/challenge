import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum InbodyPhase {
  BEFORE = 'before',
  AFTER = 'after',
}

export class UploadInbodyImageDto {
  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class UploadMultipleImagesDto {
  @IsEnum(InbodyPhase)
  phase: InbodyPhase;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
