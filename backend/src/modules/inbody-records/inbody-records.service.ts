import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateInbodyRecordDto,
  OcrExtractedInbodyRecordDto,
} from '../../dto/inbody-record.dto';
import { InbodyRecord, InbodyRecordType } from '../../entities/inbody-record.entity';
import { Participant, ParticipantRole } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { OpenAiOcrService } from '../inbody-data/openai-ocr.service';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InbodyRecordsService {
  constructor(
    @InjectRepository(InbodyRecord)
    private readonly inbodyRecordsRepository: Repository<InbodyRecord>,
    @InjectRepository(Participant)
    private readonly participantsRepository: Repository<Participant>,
    @InjectRepository(InbodyData)
    private readonly inbodyDataRepository: Repository<InbodyData>,
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
      body_fat_mass: extracted.bodyFatMass,
    };
  }

  async createOrUpdate(data: CreateInbodyRecordDto): Promise<InbodyRecord> {
    await this.ensureChallengeOpen();
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();

    const participant = await this.syncParticipantForActiveSeason({
      memberId: data.member_id,
      name: data.name,
      activeSeasonId: activeSeason.id,
    });

    const existing = await this.inbodyRecordsRepository.findOne({
      where: {
        seasonId: activeSeason.id,
        memberId: data.member_id,
        recordType: data.record_type,
      },
    });

    const record = existing ?? this.inbodyRecordsRepository.create();
    record.seasonId = activeSeason.id;
    record.memberId = data.member_id;
    record.name = data.name;
    record.recordType = data.record_type as InbodyRecordType;
    record.weight = data.weight ?? null;
    record.skeletalMuscleMass = data.skeletal_muscle_mass ?? null;
    record.bodyFatMass = data.body_fat_mass ?? null;
    record.imageUrl = data.image_url ?? null;

    const savedRecord = await this.inbodyRecordsRepository.save(record);
    await this.syncInbodyDataFromRecord(participant.id, savedRecord);

    return savedRecord;
  }

  private async syncParticipantForActiveSeason(params: {
    memberId: string;
    name: string;
    activeSeasonId: string;
  }): Promise<Participant> {
    const memberId = params.memberId.trim();
    const name = params.name.trim();

    let participant = await this.participantsRepository.findOne({
      where: { phone: memberId },
    });

    if (!participant) {
      const tempPassword = await bcrypt.hash(`ocr-${Date.now()}-${memberId}`, 10);
      participant = this.participantsRepository.create({
        email: null,
        phone: memberId,
        password: tempPassword,
        name,
        role: ParticipantRole.PARTICIPANT,
        teamName: null,
        isActive: true,
        seasonId: params.activeSeasonId,
      });
      return this.participantsRepository.save(participant);
    }

    const seasonChanged = participant.seasonId !== params.activeSeasonId;
    let changed = false;

    if (seasonChanged) {
      participant.seasonId = params.activeSeasonId;
      changed = true;
    }

    if (name && participant.name !== name) {
      participant.name = name;
      changed = true;
    }

    if (changed) {
      await this.participantsRepository.save(participant);
    }

    if (seasonChanged) {
      await this.inbodyDataRepository.delete({ participantId: participant.id });
    }

    return participant;
  }

  private async syncInbodyDataFromRecord(participantId: string, record: InbodyRecord): Promise<void> {
    let inbodyData = await this.inbodyDataRepository.findOne({
      where: { participantId },
    });

    if (!inbodyData) {
      inbodyData = this.inbodyDataRepository.create({
        participantId,
      });
    }

    if (record.recordType === InbodyRecordType.START) {
      if (record.weight !== null) {
        inbodyData.beforeWeight = record.weight;
      }
      if (record.skeletalMuscleMass !== null) {
        inbodyData.beforeSkeletalMuscleMass = record.skeletalMuscleMass;
      }
      if (record.bodyFatMass !== null) {
        inbodyData.beforeBodyFatMass = record.bodyFatMass;
      }
      if (record.imageUrl !== null) {
        inbodyData.beforeImageUrl = record.imageUrl;
      }
    } else {
      if (record.weight !== null) {
        inbodyData.afterWeight = record.weight;
      }
      if (record.skeletalMuscleMass !== null) {
        inbodyData.afterSkeletalMuscleMass = record.skeletalMuscleMass;
      }
      if (record.bodyFatMass !== null) {
        inbodyData.afterBodyFatMass = record.bodyFatMass;
      }
      if (record.imageUrl !== null) {
        inbodyData.afterImageUrl = record.imageUrl;
      }
    }

    inbodyData.submittedAt = new Date();
    await this.inbodyDataRepository.save(inbodyData);
  }

  private async ensureChallengeOpen(): Promise<void> {
    const isOpen = await this.challengeStatusService.isChallengeOpen();
    if (!isOpen) {
      throw new ForbiddenException('아직은 챌린지에 참가할 수 없습니다.');
    }
  }
}
