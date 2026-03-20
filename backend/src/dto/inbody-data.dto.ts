import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BeforeInbodyDto {
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

export class AfterInbodyDto {
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

export class UpdateInbodyDataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BeforeInbodyDto)
  before?: BeforeInbodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AfterInbodyDto)
  after?: AfterInbodyDto;
}

export class SubmitInbodyDataDto {
  @ValidateNested()
  @Type(() => BeforeInbodyDto)
  before: BeforeInbodyDto;

  @ValidateNested()
  @Type(() => AfterInbodyDto)
  after: AfterInbodyDto;
}

export class ParseInbodyImagesDto {
  @IsString()
  beforeImageUrl: string;

  @IsString()
  afterImageUrl: string;
}

export class UpdateImageUrlDto {
  @IsString()
  imageType: 'before' | 'after';

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

export class ParseSingleImageDto {
  @IsString()
  imageType: 'before' | 'after';

  @IsString()
  imageUrl: string;
}

export class AdminUpdateScoresDto {
  @IsNumber()
  @Min(0)
  communicationScore: number;

  @IsNumber()
  @Min(0)
  inspirationScore: number;
}

export class AdminUpdateSponsorDto {
  @IsString()
  @IsNotEmpty()
  sponsorName: string;
}
