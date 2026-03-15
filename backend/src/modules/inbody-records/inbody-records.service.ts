import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateInbodyRecordDto,
  OcrExtractedInbodyRecordDto,
} from '../../dto/inbody-record.dto';
import { InbodyRecord, InbodyRecordType } from '../../entities/inbody-record.entity';
import { OpenAiOcrService } from '../inbody-data/openai-ocr.service';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';

@Injectable()
export class InbodyRecordsService {
  constructor(
    @InjectRepository(InbodyRecord)
    private readonly inbodyRecordsRepository: Repository<InbodyRecord>,
    private readonly openAiOcrService: OpenAiOcrService,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  async extractFromImage(imageUrl: string): Promise<OcrExtractedInbodyRecordDto> {
    await this.ensureChallengeOpen();

    const extracted = await this.openAiOcrService.parseParticipantRecordImage(imageUrl);
    return {
      member_id: extracted.memberId,
      weight: extracted.weight,
      skeletal_muscle_mass: extracted.skeletalMuscleMass,
      body_fat_percent: extracted.bodyFatPercent,
    };
  }

  async createOrUpdate(data: CreateInbodyRecordDto): Promise<InbodyRecord> {
    await this.ensureChallengeOpen();

    const existing = await this.inbodyRecordsRepository.findOne({
      where: {
        memberId: data.member_id,
        recordType: data.record_type,
      },
    });

    const record = existing ?? this.inbodyRecordsRepository.create();
    record.memberId = data.member_id;
    record.name = data.name;
    record.recordType = data.record_type as InbodyRecordType;
    record.weight = data.weight ?? null;
    record.skeletalMuscleMass = data.skeletal_muscle_mass ?? null;
    record.bodyFatPercent = data.body_fat_percent ?? null;
    record.imageUrl = data.image_url ?? null;

    return this.inbodyRecordsRepository.save(record);
  }

  private async ensureChallengeOpen(): Promise<void> {
    const isOpen = await this.challengeStatusService.isChallengeOpen();
    if (!isOpen) {
      throw new ForbiddenException('아직은 챌린지에 참가할 수 없습니다.');
    }
  }
}
