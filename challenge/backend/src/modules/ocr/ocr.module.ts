import { Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { ImageProcessingService } from './image-processing.service';

@Module({
  controllers: [OcrController],
  providers: [OcrService, ImageProcessingService],
  exports: [OcrService],
})
export class OcrModule {}
