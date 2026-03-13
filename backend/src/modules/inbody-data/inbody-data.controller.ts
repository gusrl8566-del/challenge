import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { InbodyDataService } from './inbody-data.service';
import {
  ParseInbodyImagesDto,
  ParseSingleImageDto,
  SubmitInbodyDataDto,
  UpdateImageUrlDto,
} from '../../dto/inbody-data.dto';
import { InbodyData } from '../../entities/inbody-data.entity';

@Controller('inbody-data')
export class InbodyDataController {
  constructor(private readonly inbodyDataService: InbodyDataService) {}

  @Post(':participantId')
  async submit(
    @Param('participantId') participantId: string,
    @Body() data: SubmitInbodyDataDto,
  ): Promise<InbodyData> {
    return this.inbodyDataService.createOrUpdate(participantId, data);
  }

  @Post(':participantId/parse-images')
  async parseImagesAndSubmit(
    @Param('participantId') participantId: string,
    @Body() data: ParseInbodyImagesDto,
  ): Promise<{
    inbodyData: InbodyData;
    extracted: {
      before: {
        weight: number | null;
        skeletalMuscleMass: number | null;
        bodyFatMass: number | null;
      };
      after: {
        weight: number | null;
        skeletalMuscleMass: number | null;
        bodyFatMass: number | null;
      };
    };
    model: string;
  }> {
    return this.inbodyDataService.parseFromImagesAndSave(
      participantId,
      data.beforeImageUrl,
      data.afterImageUrl,
    );
  }

  @Post(':participantId/image-url')
  async updateImageUrl(
    @Param('participantId') participantId: string,
    @Body() data: UpdateImageUrlDto,
  ): Promise<InbodyData> {
    return this.inbodyDataService.updateImageUrl(
      participantId,
      data.imageType,
      data.imageUrl,
      data.filename ?? '',
    );
  }

  @Post(':participantId/parse-image')
  async parseSingleImage(
    @Param('participantId') participantId: string,
    @Body() data: ParseSingleImageDto,
  ): Promise<{
    imageType: 'before' | 'after';
    extracted: {
      weight: number | null;
      skeletalMuscleMass: number | null;
      bodyFatMass: number | null;
    };
    model: string;
    ocrMode: 'fast' | 'fallback' | 'fast-failed';
  }> {
    return this.inbodyDataService.parseSingleImage(
      participantId,
      data.imageType,
      data.imageUrl,
    );
  }

  @Get('participant/:participantId')
  async findByParticipant(
    @Param('participantId') participantId: string,
  ): Promise<InbodyData | null> {
    return this.inbodyDataService.findByParticipant(participantId);
  }

  @Get()
  async findAll(@Query('seasonId') seasonId?: string): Promise<InbodyData[]> {
    return this.inbodyDataService.findAll(seasonId);
  }

  @Get('gains/:participantId')
  async getGains(
    @Param('participantId') participantId: string,
  ): Promise<{ weightChange: number; muscleGain: number; fatLoss: number } | null> {
    return this.inbodyDataService.calculateGains(participantId);
  }
}
