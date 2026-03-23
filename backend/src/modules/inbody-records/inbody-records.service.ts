import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
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
import { hashPhone, maskPhone, normalizePhone } from '../../common/phone-security.util';

@Injectable()
export class InbodyRecordsService {
  private readonly logger = new Logger(InbodyRecordsService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

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

    this.logger.log(
      `OCR_EXTRACT_RESULT imageUrl=${imageUrl} memberId=${extracted.memberId ?? 'null'} weight=${extracted.weight ?? 'null'} skeletalMuscleMass=${extracted.skeletalMuscleMass ?? 'null'} bodyFatMass=${extracted.bodyFatMass ?? 'null'}`,
    );

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

    const normalizedPhone = normalizePhone(data.phone_number || data.member_id);
    if (!normalizedPhone) {
      throw new BadRequestException('휴대폰번호를 입력해주세요.');
    }

    const encryptedPhone = hashPhone(normalizedPhone);
    const normalizedName = data.name.trim();
    const normalizedSponsorName = data.sponsor_name.trim();
    const normalizedImageUrls = this.relocateUploadedImages(
      {
        inbody: data.image_url,
        front: data.front_image_url,
        back: data.back_image_url,
        side: data.side_image_url,
      },
      normalizedPhone,
      normalizedName,
    );

    const participant = await this.syncParticipantForActiveSeason({
      phone: normalizedPhone,
      encryptedPhone,
      name: normalizedName,
      sponsorName: normalizedSponsorName,
      activeSeasonId: activeSeason.id,
    });

    const existing = await this.inbodyRecordsRepository.findOne({
      where: {
        seasonId: activeSeason.id,
        memberId: encryptedPhone,
        recordType: data.record_type,
      },
    });

    const record = existing ?? this.inbodyRecordsRepository.create();
    record.seasonId = activeSeason.id;
    record.memberId = encryptedPhone;
    record.name = normalizedName;
    record.recordType = data.record_type as InbodyRecordType;
    record.weight = data.weight ?? null;
    record.skeletalMuscleMass = data.skeletal_muscle_mass ?? null;
    record.bodyFatMass = data.body_fat_mass ?? null;
    record.imageUrl = normalizedImageUrls.inbody ?? null;

    const savedRecord = await this.inbodyRecordsRepository.save(record);
    await this.syncInbodyDataFromRecord(participant.id, savedRecord, {
      front_image_url: normalizedImageUrls.front,
      back_image_url: normalizedImageUrls.back,
      side_image_url: normalizedImageUrls.side,
    });

    this.logger.log(
      `INBODY_SAVE_RESULT phone=${maskPhone(normalizedPhone)} recordType=${savedRecord.recordType} source=${data.source || 'unknown'} id=${savedRecord.id}`,
    );

    return savedRecord;
  }

  private async syncParticipantForActiveSeason(params: {
    phone: string;
    encryptedPhone: string;
    name: string;
    sponsorName: string;
    activeSeasonId: string;
  }): Promise<Participant> {
    const phone = params.phone;
    const encryptedPhone = params.encryptedPhone;
    const name = params.name;
    const sponsorName = params.sponsorName;

    let participant = await this.participantsRepository.findOne({
      where: [{ phone: encryptedPhone }, { phone }],
    });

    if (!participant) {
      const tempPassword = await bcrypt.hash(`ocr-${Date.now()}-${phone}`, 10);
      participant = this.participantsRepository.create({
        email: null,
        phone: encryptedPhone,
        password: tempPassword,
        name,
        sponsorName,
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

    if (participant.sponsorName !== sponsorName) {
      participant.sponsorName = sponsorName;
      changed = true;
    }

    if (participant.phone !== encryptedPhone) {
      participant.phone = encryptedPhone;
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

  private async syncInbodyDataFromRecord(
    participantId: string,
    record: InbodyRecord,
    source: Pick<CreateInbodyRecordDto, 'front_image_url' | 'back_image_url' | 'side_image_url'>,
  ): Promise<void> {
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
      if (source.front_image_url) {
        inbodyData.beforeFrontImageUrl = source.front_image_url;
      }
      if (source.back_image_url) {
        inbodyData.beforeBackImageUrl = source.back_image_url;
      }
      if (source.side_image_url) {
        inbodyData.beforeSideImageUrl = source.side_image_url;
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
      if (source.front_image_url) {
        inbodyData.afterFrontImageUrl = source.front_image_url;
      }
      if (source.back_image_url) {
        inbodyData.afterBackImageUrl = source.back_image_url;
      }
      if (source.side_image_url) {
        inbodyData.afterSideImageUrl = source.side_image_url;
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

  private relocateUploadedImages(
    imageUrls: {
      inbody?: string;
      front?: string;
      back?: string;
      side?: string;
    },
    phone: string,
    name: string,
  ): {
    inbody?: string;
    front?: string;
    back?: string;
    side?: string;
  } {
    const folderName = this.toSafeFolderName(phone, name);
    const targetDir = path.join(this.uploadDir, folderName);
    fs.mkdirSync(targetDir, { recursive: true });

    return {
      inbody: this.moveImageToTarget(imageUrls.inbody, folderName, 'inbody.jpg'),
      front: this.moveImageToTarget(imageUrls.front, folderName, 'front.jpg'),
      back: this.moveImageToTarget(imageUrls.back, folderName, 'back.jpg'),
      side: this.moveImageToTarget(imageUrls.side, folderName, 'side.jpg'),
    };
  }

  private moveImageToTarget(imageUrl: string | undefined, folderName: string, fileName: string): string | undefined {
    if (!imageUrl) {
      return undefined;
    }

    const relativePath = this.toRelativeUploadPath(imageUrl);
    if (!relativePath) {
      return imageUrl;
    }

    const sourcePath = path.join(this.uploadDir, relativePath);
    const targetRelativePath = path.posix.join(folderName, fileName);
    const targetPath = path.join(this.uploadDir, targetRelativePath);

    if (sourcePath === targetPath) {
      return `/uploads/${targetRelativePath}`;
    }

    if (!fs.existsSync(sourcePath)) {
      if (fs.existsSync(targetPath)) {
        return `/uploads/${targetRelativePath}`;
      }
      return imageUrl;
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    fs.renameSync(sourcePath, targetPath);
    return `/uploads/${targetRelativePath}`;
  }

  private toRelativeUploadPath(imageUrl: string): string | null {
    if (!imageUrl.startsWith('/uploads/')) {
      return null;
    }

    return imageUrl.replace(/^\/uploads\//, '');
  }

  private toSafeFolderName(phone: string, name: string): string {
    const normalizedName = name
      .trim()
      .replace(/\s+/g, '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\.+/g, '')
      .slice(0, 40);
    const safeName = normalizedName || 'unknown';
    return `${phone}_${safeName}`;
  }
}
