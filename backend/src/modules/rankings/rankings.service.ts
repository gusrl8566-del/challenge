import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';

export interface RankingEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    sponsorName: string | null;
    teamName: string | null;
    communicationScore: number;
    inspirationScore: number;
  };
  metrics: {
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
    totalScore: number;
  };
}

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
    @InjectRepository(InbodyData)
    private inbodyDataRepository: Repository<InbodyData>,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  private async resolveSeasonId(seasonId?: string): Promise<string> {
    const activeSeason = await this.challengeStatusService.getActiveSeasonOrDefault();
    const targetSeasonId = seasonId || activeSeason.id;
    await this.participantsRepository.update({ seasonId: IsNull() }, { seasonId: activeSeason.id });
    return targetSeasonId;
  }

  private roundTo(value: number, decimals: number = 1): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private toFiniteNumber(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isValidBodyMetricRow(data: InbodyData): boolean {
    const beforeWeight = this.toFiniteNumber(data.beforeWeight);
    const beforeSkeletalMuscleMass = this.toFiniteNumber(data.beforeSkeletalMuscleMass);
    const beforeBodyFatMass = this.toFiniteNumber(data.beforeBodyFatMass);
    const afterWeight = this.toFiniteNumber(data.afterWeight);
    const afterSkeletalMuscleMass = this.toFiniteNumber(data.afterSkeletalMuscleMass);
    const afterBodyFatMass = this.toFiniteNumber(data.afterBodyFatMass);

    if (
      beforeWeight === null ||
      beforeSkeletalMuscleMass === null ||
      beforeBodyFatMass === null ||
      afterWeight === null ||
      afterSkeletalMuscleMass === null ||
      afterBodyFatMass === null
    ) {
      return false;
    }

    if (
      beforeWeight <= 0 ||
      beforeSkeletalMuscleMass <= 0 ||
      beforeBodyFatMass <= 0 ||
      afterWeight <= 0 ||
      afterSkeletalMuscleMass <= 0 ||
      afterBodyFatMass <= 0
    ) {
      return false;
    }

    if (
      beforeSkeletalMuscleMass > beforeWeight ||
      beforeBodyFatMass > beforeWeight ||
      afterSkeletalMuscleMass > afterWeight ||
      afterBodyFatMass > afterWeight
    ) {
      return false;
    }

    return data.participant?.isActive === true;
  }

  private toBodyRankingEntry(data: InbodyData, totalScore: number): RankingEntry {
    const beforeWeight = Number(data.beforeWeight);
    const beforeSkeletalMuscleMass = Number(data.beforeSkeletalMuscleMass);
    const beforeBodyFatMass = Number(data.beforeBodyFatMass);
    const afterWeight = Number(data.afterWeight);
    const afterSkeletalMuscleMass = Number(data.afterSkeletalMuscleMass);
    const afterBodyFatMass = Number(data.afterBodyFatMass);
    const muscleGain = this.roundTo(afterSkeletalMuscleMass - beforeSkeletalMuscleMass);
    const fatLoss = this.roundTo(beforeBodyFatMass - afterBodyFatMass);

    return {
      rank: 0,
      participant: {
        id: data.participant.id,
        name: data.participant.name,
        sponsorName: data.participant.sponsorName,
        teamName: data.participant.teamName,
        communicationScore: data.participant.communicationScore || 0,
        inspirationScore: data.participant.inspirationScore || 0,
      },
      metrics: {
        weightChange: this.roundTo(afterWeight - beforeWeight),
        muscleGain,
        fatLoss,
        totalScore: this.roundTo(totalScore),
      },
    };
  }

  async getGainKingRankings(seasonId?: string): Promise<RankingEntry[]> {
    const targetSeasonId = await this.resolveSeasonId(seasonId);
    const inbodyDataList = await this.inbodyDataRepository.find({
      where: { participant: { seasonId: targetSeasonId } },
      relations: ['participant'],
    });

    const rankings: RankingEntry[] = inbodyDataList
      .filter((data) => this.isValidBodyMetricRow(data))
      .map((data) => {
        const muscleGain =
          Number(data.afterSkeletalMuscleMass) - Number(data.beforeSkeletalMuscleMass);
        const fatLoss = Number(data.beforeBodyFatMass) - Number(data.afterBodyFatMass);
        const score = this.roundTo(muscleGain * 2 + fatLoss);

        return this.toBodyRankingEntry(data, score);
      })
      .sort((a, b) => {
        if (b.metrics.muscleGain !== a.metrics.muscleGain) {
          return b.metrics.muscleGain - a.metrics.muscleGain;
        }
        return b.metrics.fatLoss - a.metrics.fatLoss;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return rankings;
  }

  async getLossKingRankings(seasonId?: string): Promise<RankingEntry[]> {
    const targetSeasonId = await this.resolveSeasonId(seasonId);
    const inbodyDataList = await this.inbodyDataRepository.find({
      where: { participant: { seasonId: targetSeasonId } },
      relations: ['participant'],
    });

    const rankings: RankingEntry[] = inbodyDataList
      .filter((data) => this.isValidBodyMetricRow(data))
      .map((data) => {
        const muscleGain =
          Number(data.afterSkeletalMuscleMass) - Number(data.beforeSkeletalMuscleMass);
        const fatLoss = Number(data.beforeBodyFatMass) - Number(data.afterBodyFatMass);
        const score = this.roundTo(fatLoss * 2 + muscleGain);

        return this.toBodyRankingEntry(data, score);
      })
      .sort((a, b) => {
        if (b.metrics.fatLoss !== a.metrics.fatLoss) {
          return b.metrics.fatLoss - a.metrics.fatLoss;
        }
        return b.metrics.muscleGain - a.metrics.muscleGain;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return rankings;
  }

  async getCommunicationKingRankings(seasonId?: string): Promise<RankingEntry[]> {
    const targetSeasonId = await this.resolveSeasonId(seasonId);
    const participants = await this.participantsRepository.find({
      where: { isActive: true, seasonId: targetSeasonId },
    });

    return participants
      .filter((p) => p.communicationScore !== null && p.communicationScore > 0)
      .map((participant) => ({
        rank: 0,
        participant: {
          id: participant.id,
          name: participant.name,
          sponsorName: participant.sponsorName,
          teamName: participant.teamName,
          communicationScore: participant.communicationScore || 0,
          inspirationScore: participant.inspirationScore || 0,
        },
        metrics: {
          weightChange: 0,
          muscleGain: 0,
          fatLoss: 0,
          totalScore: participant.communicationScore || 0,
        },
      }))
      .sort((a, b) => b.metrics.totalScore - a.metrics.totalScore)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async getInspirationKingRankings(seasonId?: string): Promise<RankingEntry[]> {
    const targetSeasonId = await this.resolveSeasonId(seasonId);
    const participants = await this.participantsRepository.find({
      where: { isActive: true, seasonId: targetSeasonId },
    });

    return participants
      .filter((p) => p.inspirationScore !== null && p.inspirationScore > 0)
      .map((participant) => ({
        rank: 0,
        participant: {
          id: participant.id,
          name: participant.name,
          sponsorName: participant.sponsorName,
          teamName: participant.teamName,
          communicationScore: participant.communicationScore || 0,
          inspirationScore: participant.inspirationScore || 0,
        },
        metrics: {
          weightChange: 0,
          muscleGain: 0,
          fatLoss: 0,
          totalScore: participant.inspirationScore || 0,
        },
      }))
      .sort((a, b) => b.metrics.totalScore - a.metrics.totalScore)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }
}
