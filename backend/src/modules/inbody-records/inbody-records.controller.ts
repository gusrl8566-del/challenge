import { Body, Controller, Post } from '@nestjs/common';
import {
  CreateInbodyRecordDto,
  ExtractInbodyRecordFromImageDto,
  OcrExtractedInbodyRecordDto,
} from '../../dto/inbody-record.dto';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { InbodyRecordsService } from './inbody-records.service';

@Controller('inbody-records')
export class InbodyRecordsController {
  constructor(private readonly inbodyRecordsService: InbodyRecordsService) {}

  @Post('ocr-extract')
  async extractFromImage(
    @Body() body: ExtractInbodyRecordFromImageDto,
  ): Promise<OcrExtractedInbodyRecordDto> {
    return this.inbodyRecordsService.extractFromImage(body.image_url);
  }

  @Post()
  async createOrUpdate(@Body() body: CreateInbodyRecordDto): Promise<InbodyRecord> {
    return this.inbodyRecordsService.createOrUpdate(body);
  }
}
