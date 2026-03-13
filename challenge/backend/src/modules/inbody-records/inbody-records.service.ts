import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InbodyRecord, InbodyPhase } from '../../entities/inbody-record.entity';
import { CreateInbodyRecordDto } from '../../dto/inbody-record.dto';

@Injectable()
export class InbodyRecordsService {
  constructor(
    @InjectRepository(InbodyRecord)
    private recordsRepository: Repository<InbodyRecord>,
  ) {}

  async create(participantId: string, dto: CreateInbodyRecordDto): Promise<InbodyRecord> {
    const existing = await this.recordsRepository.findOne({
      where: { participantId, phase: dto.phase },
    });

    if (existing) {
      Object.assign(existing, {
        weight: dto.weight,
        skeletalMuscleMass: dto.skeletalMuscleMass,
        bodyFatMass: dto.bodyFatMass,
        imageUrl: dto.imageUrl,
      });
      return this.recordsRepository.save(existing);
    }

    const record = this.recordsRepository.create({
      participantId,
      phase: dto.phase,
      weight: dto.weight,
      skeletalMuscleMass: dto.skeletalMuscleMass,
      bodyFatMass: dto.bodyFatMass,
      imageUrl: dto.imageUrl,
    });

    return this.recordsRepository.save(record);
  }

  async findByParticipant(participantId: string): Promise<InbodyRecord[]> {
    return this.recordsRepository.find({
      where: { participantId },
      order: { phase: 'ASC' },
    });
  }

  async findAll(): Promise<InbodyRecord[]> {
    return this.recordsRepository.find({
      relations: ['participant'],
    });
  }

  async calculateGains(participantId: string): Promise<{
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
  } | null> {
    const records = await this.findByParticipant(participantId);
    
    const before = records.find(r => r.phase === InbodyPhase.BEFORE);
    const after = records.find(r => r.phase === InbodyPhase.AFTER);

    if (!before?.weight || !after?.weight) {
      return null;
    }

    return {
      weightChange: Number(after.weight) - Number(before.weight),
      muscleGain: Number(after.skeletalMuscleMass) - Number(before.skeletalMuscleMass),
      fatLoss: Number(before.bodyFatMass) - Number(after.bodyFatMass),
    };
  }
}
