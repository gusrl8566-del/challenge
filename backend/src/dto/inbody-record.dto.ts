import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { InbodyRecordType } from '../entities/inbody-record.entity';

export class CreateInbodyRecordDto {
  @IsString()
  member_id: string;

  @IsString()
  name: string;

  @IsEnum(InbodyRecordType)
  record_type: InbodyRecordType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(300)
  weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  skeletal_muscle_mass?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  body_fat_mass?: number;

  @IsOptional()
  @IsString()
  image_url?: string;
}

export class ExtractInbodyRecordFromImageDto {
  @IsString()
  image_url: string;
}

export class OcrExtractedInbodyRecordDto {
  member_id: string | null;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  body_fat_mass: number | null;
}
