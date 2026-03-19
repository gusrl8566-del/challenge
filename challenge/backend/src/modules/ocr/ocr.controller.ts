import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';
import { InbodyOcrResult } from './ocr.types';

export class OcrInbodyDto {
  imageUrl?: string;
}

export class OcrInbodyBase64Dto {
  base64Image: string;
}

@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(private readonly ocrService: OcrService) {}

  @Post('inbody')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  async ocrFromFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<InbodyOcrResult> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WEBP');
    }

    this.logger.log(
      `OCR_REQUEST_RECEIVED method=file name=${file.originalname} mime=${file.mimetype} size=${file.size}`,
    );

    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await this.ocrService.extractInbodyDataFromBase64(base64Image);

    this.logger.log(
      `OCR_REQUEST_COMPLETED method=file weight=${result.muscle_fat_analysis.weight_kg ?? 'null'} skeletalMuscleMass=${result.muscle_fat_analysis.skeletal_muscle_mass_kg ?? 'null'} bodyFatMass=${result.muscle_fat_analysis.body_fat_mass_kg ?? 'null'}`,
    );

    return result;
  }

  @Post('inbody/url')
  @HttpCode(HttpStatus.OK)
  async ocrFromUrl(@Body() dto: OcrInbodyDto): Promise<InbodyOcrResult> {
    if (!dto.imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    return this.ocrService.extractInbodyData(dto.imageUrl);
  }

  @Post('inbody/base64')
  @HttpCode(HttpStatus.OK)
  async ocrFromBase64(@Body() dto: OcrInbodyBase64Dto): Promise<InbodyOcrResult> {
    if (!dto.base64Image) {
      throw new BadRequestException('base64Image is required');
    }

    if (!dto.base64Image.startsWith('data:image/')) {
      throw new BadRequestException('Invalid base64 image format');
    }

    this.logger.log('OCR_REQUEST_RECEIVED method=base64');
    const result = await this.ocrService.extractInbodyDataFromBase64(dto.base64Image);
    this.logger.log(
      `OCR_REQUEST_COMPLETED method=base64 weight=${result.muscle_fat_analysis.weight_kg ?? 'null'} skeletalMuscleMass=${result.muscle_fat_analysis.skeletal_muscle_mass_kg ?? 'null'} bodyFatMass=${result.muscle_fat_analysis.body_fat_mass_kg ?? 'null'}`,
    );
    return result;
  }
}
