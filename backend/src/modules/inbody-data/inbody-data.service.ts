import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { InbodyData } from '../../entities/inbody-data.entity';
import { SubmitInbodyDataDto } from '../../dto/inbody-data.dto';
import { OpenAiOcrService } from './openai-ocr.service';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';
import { Participant } from '../../entities/participant.entity';

@Injectable()
export class InbodyDataService {
  private readonly maxEditCount = 3;

  constructor(
    @InjectRepository(InbodyData)
    private inbodyDataRepository: Repository<InbodyData>,
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
    private readonly openAiOcrService: OpenAiOcrService,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  async createOrUpdate(
    participantId: string,
    data: SubmitInbodyDataDto,
  ): Promise<InbodyData> {
    await this.ensureChallengeOpen();
    await this.syncParticipantToActiveSeason(participantId);

    let inbodyData = await this.inbodyDataRepository.findOne({
      where: { participantId },
    });

    if (inbodyData) {
      if (inbodyData.submittedAt) {
        if (inbodyData.editCount >= this.maxEditCount) {
          throw new ForbiddenException('현재 제출을 처리할 수 없습니다.');
        }

        inbodyData.editCount += 1;
      }

      inbodyData = {
        ...inbodyData,
        beforeWeight: data.before.weight,
        beforeSkeletalMuscleMass: data.before.skeletalMuscleMass,
        beforeBodyFatMass: data.before.bodyFatMass,
        beforeImageUrl: data.before.imageUrl,
        afterWeight: data.after.weight,
        afterSkeletalMuscleMass: data.after.skeletalMuscleMass,
        afterBodyFatMass: data.after.bodyFatMass,
        afterImageUrl: data.after.imageUrl,
        submittedAt: new Date(),
      } as InbodyData;
    } else {
      inbodyData = this.inbodyDataRepository.create({
        participantId,
        beforeWeight: data.before.weight,
        beforeSkeletalMuscleMass: data.before.skeletalMuscleMass,
        beforeBodyFatMass: data.before.bodyFatMass,
        beforeImageUrl: data.before.imageUrl,
        afterWeight: data.after.weight,
        afterSkeletalMuscleMass: data.after.skeletalMuscleMass,
        afterBodyFatMass: data.after.bodyFatMass,
        afterImageUrl: data.after.imageUrl,
        submittedAt: new Date(),
        editCount: 0,
      });
    }

    return this.inbodyDataRepository.save(inbodyData);
  }

  async findByParticipant(participantId: string): Promise<InbodyData | null> {
    return this.inbodyDataRepository.findOne({
      where: { participantId },
    });
  }

  async findAll(seasonId?: string): Promise<InbodyData[]> {
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
    const targetSeasonId = seasonId || activeSeason.id;

    await this.participantsRepository.update({ seasonId: IsNull() }, { seasonId: activeSeason.id });

    return this.inbodyDataRepository.find({
      where: { participant: { seasonId: targetSeasonId } },
      relations: ['participant'],
    });
  }

  async parseFromImagesAndSave(
    participantId: string,
    beforeImageUrl: string,
    afterImageUrl: string,
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
    await this.ensureChallengeOpen();

    const parsed = await this.openAiOcrService.parseInbodyImages(beforeImageUrl, afterImageUrl);

    const inbodyData = await this.createOrUpdate(participantId, {
      before: {
        weight: this.toOptionalNumber(parsed.metrics.before.weight),
        skeletalMuscleMass: this.toOptionalNumber(parsed.metrics.before.skeletalMuscleMass),
        bodyFatMass: this.toOptionalNumber(parsed.metrics.before.bodyFatMass),
        imageUrl: beforeImageUrl,
      },
      after: {
        weight: this.toOptionalNumber(parsed.metrics.after.weight),
        skeletalMuscleMass: this.toOptionalNumber(parsed.metrics.after.skeletalMuscleMass),
        bodyFatMass: this.toOptionalNumber(parsed.metrics.after.bodyFatMass),
        imageUrl: afterImageUrl,
      },
    });

    return {
      inbodyData,
      extracted: parsed.metrics,
      model: parsed.model,
    };
  }

  async parseSingleImage(
    participantId: string,
    imageType: 'before' | 'after',
    imageUrl: string,
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
    await this.ensureChallengeOpen();

    const parsed = await this.openAiOcrService.parseSingleInbodyImage(imageUrl);

    await this.updateImageUrl(participantId, imageType, imageUrl, '');

    return {
      imageType,
      extracted: parsed.metrics,
      model: parsed.model,
      ocrMode: parsed.ocrMode,
    };
  }

  async updateImageUrl(
    participantId: string,
    imageType: 'before' | 'after',
    imageUrl: string,
    filename: string,
  ): Promise<InbodyData> {
    await this.ensureChallengeOpen();
    await this.syncParticipantToActiveSeason(participantId);

    let inbodyData = await this.findByParticipant(participantId);

    if (!inbodyData) {
      inbodyData = this.inbodyDataRepository.create({
        participantId,
      });
    }

    if (imageType === 'before') {
      inbodyData.beforeImageUrl = imageUrl;
      inbodyData.beforeImageFilename = filename;
    } else {
      inbodyData.afterImageUrl = imageUrl;
      inbodyData.afterImageFilename = filename;
    }

    return this.inbodyDataRepository.save(inbodyData);
  }

  async calculateGains(participantId: string): Promise<{
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
  } | null> {
    const inbodyData = await this.findByParticipant(participantId);

    if (!inbodyData || !inbodyData.beforeWeight || !inbodyData.afterWeight) {
      return null;
    }

    return {
      weightChange: Number(inbodyData.afterWeight) - Number(inbodyData.beforeWeight),
      muscleGain: Number(inbodyData.afterSkeletalMuscleMass) - Number(inbodyData.beforeSkeletalMuscleMass),
      fatLoss: Number(inbodyData.beforeBodyFatMass) - Number(inbodyData.afterBodyFatMass),
    };
  }

  private toOptionalNumber(value: number | null): number | undefined {
    return value === null ? undefined : value;
  }

  private async ensureChallengeOpen(): Promise<void> {
    const isOpen = await this.challengeStatusService.isChallengeOpen();
    if (!isOpen) {
      throw new ForbiddenException('아직은 챌린지에 참가할 수 없습니다.');
    }
  }

  private async syncParticipantToActiveSeason(participantId: string): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: { id: participantId },
      select: ['id', 'seasonId'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
    if (participant.seasonId === activeSeason.id) {
      return;
    }

    participant.seasonId = activeSeason.id;
    await this.participantsRepository.save(participant);
    await this.inbodyDataRepository.delete({ participantId });
  }
}
