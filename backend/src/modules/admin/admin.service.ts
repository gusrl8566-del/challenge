import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { AdminUpdateScoresDto } from '../../dto/inbody-data.dto';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';
import { ChallengeSeason } from '../../entities/challenge-season.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
    @InjectRepository(InbodyData)
    private inbodyDataRepository: Repository<InbodyData>,
    @InjectRepository(InbodyRecord)
    private inbodyRecordsRepository: Repository<InbodyRecord>,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  async getChallengeStatus(): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    return this.challengeStatusService.getStatus();
  }

  async setChallengeStatus(
    isOpen: boolean,
  ): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    return this.challengeStatusService.setStatus(isOpen);
  }

  async getSeasons(): Promise<ChallengeSeason[]> {
    return this.challengeStatusService.listSeasons();
  }

  async createSeason(name: string): Promise<ChallengeSeason> {
    return this.challengeStatusService.createSeason(name);
  }

  async activateSeason(seasonId: string): Promise<ChallengeSeason> {
    return this.challengeStatusService.activateSeason(seasonId);
  }

  async updateSeasonName(seasonId: string, name: string): Promise<ChallengeSeason> {
    return this.challengeStatusService.updateSeasonName(seasonId, name);
  }

  async updateParticipantScores(
    participantId: string,
    dto: AdminUpdateScoresDto,
  ): Promise<Participant> {
    await this.participantsRepository.update(participantId, {
      communicationScore: dto.communicationScore,
      inspirationScore: dto.inspirationScore,
    });

    const updated = await this.participantsRepository.findOne({
      where: { id: participantId },
    });

    if (!updated) {
      throw new NotFoundException('Participant not found');
    }

    return updated;
  }

  async getAllParticipants(seasonId?: string): Promise<Participant[]> {
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
    const targetSeasonId = seasonId || activeSeason.id;

    await this.participantsRepository.update({ seasonId: IsNull() }, { seasonId: activeSeason.id });

    return this.participantsRepository.find({
      where: { seasonId: targetSeasonId },
      order: { createdAt: 'DESC' },
    });
  }

  async getParticipantById(id: string): Promise<Participant> {
    const participant = await this.participantsRepository.findOne({
      where: { id },
      relations: ['inbodyData'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    return participant;
  }

  async deleteParticipantById(id: string): Promise<{ message: string }> {
    const participant = await this.participantsRepository.findOne({
      where: { id },
      select: ['id', 'phone', 'seasonId'],
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.inbodyDataRepository.delete({ participantId: id });

    if (participant.phone) {
      if (participant.seasonId) {
        await this.inbodyRecordsRepository.delete({
          memberId: participant.phone,
          seasonId: participant.seasonId,
        });
      } else {
        await this.inbodyRecordsRepository.delete({
          memberId: participant.phone,
        });
      }
    }

    await this.participantsRepository.delete({ id });

    return { message: 'Participant deleted' };
  }
}
