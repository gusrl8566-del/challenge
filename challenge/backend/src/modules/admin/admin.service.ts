import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { Score } from '../../entities/score.entity';
import { UpdateScoreDto } from '../../dto/score.dto';
import { UpdateSponsorDto } from '../../dto/participant.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepo: Repository<Participant>,
    @InjectRepository(Score)
    private scoresRepo: Repository<Score>,
  ) {}

  async getAllParticipants(): Promise<Participant[]> {
    return this.participantsRepo.find({
      relations: ['inbodyRecords', 'score'],
      order: { createdAt: 'DESC' },
    });
  }

  async getParticipant(id: string): Promise<Participant> {
    const participant = await this.participantsRepo.findOne({
      where: { id },
      relations: ['inbodyRecords', 'score'],
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    return participant;
  }

  async updateScores(participantId: string, dto: UpdateScoreDto): Promise<Score> {
    let score = await this.scoresRepo.findOne({ where: { participantId } });

    if (!score) {
      score = this.scoresRepo.create({
        participantId,
        communicationScore: dto.communicationScore || 0,
        inspirationScore: dto.inspirationScore || 0,
      });
    } else {
      if (dto.communicationScore !== undefined) {
        score.communicationScore = dto.communicationScore;
      }
      if (dto.inspirationScore !== undefined) {
        score.inspirationScore = dto.inspirationScore;
      }
    }

    return this.scoresRepo.save(score);
  }

  async updateSponsor(participantId: string, dto: UpdateSponsorDto): Promise<Participant> {
    const normalizedSponsorName = dto.sponsorName.trim();
    if (!normalizedSponsorName) {
      throw new BadRequestException('Sponsor name is required');
    }

    const participant = await this.participantsRepo.findOne({
      where: { id: participantId },
      relations: ['inbodyRecords', 'score'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.sponsorName = normalizedSponsorName;
    return this.participantsRepo.save(participant);
  }
}
