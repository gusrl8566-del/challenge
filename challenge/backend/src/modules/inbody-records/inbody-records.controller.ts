import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { InbodyRecordsService } from './inbody-records.service';
import { CreateInbodyRecordDto } from '../../dto/inbody-record.dto';
import { InbodyRecord } from '../../entities/inbody-record.entity';

@Controller('inbody-records')
export class InbodyRecordsController {
  private readonly logger = new Logger(InbodyRecordsController.name);

  constructor(private readonly service: InbodyRecordsService) {}

  @Post(':participantId')
  async create(
    @Param('participantId') participantId: string,
    @Body() dto: CreateInbodyRecordDto,
  ): Promise<InbodyRecord> {
    this.logger.log(
      `INBODY_SUBMIT_RECEIVED participantId=${participantId} phase=${dto.phase} source=${dto.source || 'unknown'} weight=${dto.weight ?? 'null'} skeletalMuscleMass=${dto.skeletalMuscleMass ?? 'null'} bodyFatMass=${dto.bodyFatMass ?? 'null'}`,
    );

    return this.service.create(participantId, dto);
  }

  @Get('participant/:participantId')
  async findByParticipant(
    @Param('participantId') participantId: string,
  ): Promise<InbodyRecord[]> {
    return this.service.findByParticipant(participantId);
  }

  @Get()
  async findAll(): Promise<InbodyRecord[]> {
    return this.service.findAll();
  }

  @Get('gains/:participantId')
  async getGains(
    @Param('participantId') participantId: string,
  ): Promise<{ weightChange: number; muscleGain: number; fatLoss: number } | null> {
    return this.service.calculateGains(participantId);
  }
}
