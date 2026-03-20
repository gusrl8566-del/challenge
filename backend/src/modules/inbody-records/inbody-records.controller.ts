import { Body, Controller, Logger, Post } from '@nestjs/common';
import {
  CreateInbodyRecordDto,
  ExtractInbodyRecordFromImageDto,
  OcrExtractedInbodyRecordDto,
} from '../../dto/inbody-record.dto';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { InbodyRecordsService } from './inbody-records.service';

@Controller('inbody-records')
export class InbodyRecordsController {
  private readonly logger = new Logger(InbodyRecordsController.name);

  constructor(private readonly inbodyRecordsService: InbodyRecordsService) {}

  @Post('ocr-extract')
  async extractFromImage(
    @Body() body: ExtractInbodyRecordFromImageDto,
  ): Promise<OcrExtractedInbodyRecordDto> {
    this.logger.log(`OCR_EXTRACT_REQUEST imageUrl=${body.image_url}`);
    return this.inbodyRecordsService.extractFromImage(body.image_url);
  }

  @Post()
  async createOrUpdate(@Body() body: CreateInbodyRecordDto): Promise<InbodyRecord> {
    this.logger.log(
      `INBODY_SAVE_REQUEST memberId=${body.member_id} sponsorName=${body.sponsor_name} recordType=${body.record_type} source=${body.source || 'unknown'} imageUrl=${body.image_url || 'none'} weight=${body.weight ?? 'null'} skeletalMuscleMass=${body.skeletal_muscle_mass ?? 'null'} bodyFatMass=${body.body_fat_mass ?? 'null'}`,
    );
    return this.inbodyRecordsService.createOrUpdate(body);
  }
}
