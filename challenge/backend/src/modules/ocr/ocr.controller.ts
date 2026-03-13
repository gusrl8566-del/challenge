import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
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

    return this.ocrService.extractInbodyData(file.path);
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

    return this.ocrService.extractInbodyDataFromBase64(dto.base64Image);
  }
}
