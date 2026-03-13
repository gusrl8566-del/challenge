import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateScoreDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  communicationScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  inspirationScore?: number;
}
