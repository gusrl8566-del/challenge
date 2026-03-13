import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyRecord, InbodyPhase } from '../../entities/inbody-record.entity';
import { Score } from '../../entities/score.entity';

export interface RankingEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    phone: string;
  };
  before?: {
    weight: number;
    skeletalMuscleMass: number;
    bodyFatMass: number;
  };
  after?: {
    weight: number;
    skeletalMuscleMass: number;
    bodyFatMass: number;
  };
  metrics: {
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
    totalScore: number;
  };
}

export interface ScoreEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    phone: string;
  };
  score: number;
}

export interface AllRankings {
  gainKing: RankingEntry[];
  lossKing: RankingEntry[];
  communicationKing: ScoreEntry[];
  inspirationKing: ScoreEntry[];
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    @InjectRepository(Participant)
    private participantsRepo: Repository<Participant>,
    @InjectRepository(InbodyRecord)
    private recordsRepo: Repository<InbodyRecord>,
    @InjectRepository(Score)
    private scoresRepo: Repository<Score>,
  ) {}

  async getAllRankings(): Promise<AllRankings> {
    const [gainKing, lossKing, communicationKing, inspirationKing] = await Promise.all([
      this.getGainKingRankings(),
      this.getLossKingRankings(),
      this.getCommunicationKingRankings(),
      this.getInspirationKingRankings(),
    ]);

    return {
      gainKing,
      lossKing,
      communicationKing,
      inspirationKing,
    };
  }

  async getGainKingRankings(): Promise<RankingEntry[]> {
    const records = await this.recordsRepo.find({
      relations: ['participant'],
      where: { phase: InbodyPhase.BEFORE },
    });

    const participantIds = records.map((r) => r.participantId);
    
    if (participantIds.length === 0) {
      return [];
    }

    const afterRecords = await this.recordsRepo.find({
      where: {
        participantId: In(participantIds),
        phase: InbodyPhase.AFTER,
      },
    });

    const afterMap = new Map(afterRecords.map((r) => [r.participantId, r]));

    const rankings: RankingEntry[] = records
      .filter((before) => before.weight && before.skeletalMuscleMass && before.bodyFatMass)
      .map((before) => {
        const after = afterMap.get(before.participantId);
        
        if (!after || !after.weight || !after.skeletalMuscleMass || !after.bodyFatMass) {
          return null;
        }

        const muscleGain = Number(after.skeletalMuscleMass) - Number(before.skeletalMuscleMass);
        const fatLoss = Number(before.bodyFatMass) - Number(after.bodyFatMass);

        return {
          rank: 0,
          participant: {
            id: before.participant.id,
            name: before.participant.name,
            phone: before.participant.phone,
          },
          before: {
            weight: Number(before.weight),
            skeletalMuscleMass: Number(before.skeletalMuscleMass),
            bodyFatMass: Number(before.bodyFatMass),
          },
          after: {
            weight: Number(after.weight),
            skeletalMuscleMass: Number(after.skeletalMuscleMass),
            bodyFatMass: Number(after.bodyFatMass),
          },
          metrics: {
            weightChange: Number(after.weight) - Number(before.weight),
            muscleGain,
            fatLoss,
            totalScore: 0,
          },
        };
      })
      .filter((r): r is RankingEntry => r !== null)
      .sort((a, b) => {
        if (b.metrics.muscleGain !== a.metrics.muscleGain) {
          return b.metrics.muscleGain - a.metrics.muscleGain;
        }
        return b.metrics.fatLoss - a.metrics.fatLoss;
      })
      .map((entry, i) => ({
        ...entry,
        rank: i + 1,
        metrics: {
          ...entry.metrics,
          totalScore: entry.metrics.muscleGain * 2 + entry.metrics.fatLoss,
        },
      }));

    return rankings;
  }

  async getLossKingRankings(): Promise<RankingEntry[]> {
    const records = await this.recordsRepo.find({
      relations: ['participant'],
      where: { phase: InbodyPhase.BEFORE },
    });

    const participantIds = records.map((r) => r.participantId);
    
    if (participantIds.length === 0) {
      return [];
    }

    const afterRecords = await this.recordsRepo.find({
      where: {
        participantId: In(participantIds),
        phase: InbodyPhase.AFTER,
      },
    });

    const afterMap = new Map(afterRecords.map((r) => [r.participantId, r]));

    const rankings: RankingEntry[] = records
      .filter((before) => before.weight && before.skeletalMuscleMass && before.bodyFatMass)
      .map((before) => {
        const after = afterMap.get(before.participantId);
        
        if (!after || !after.weight || !after.skeletalMuscleMass || !after.bodyFatMass) {
          return null;
        }

        const muscleGain = Number(after.skeletalMuscleMass) - Number(before.skeletalMuscleMass);
        const fatLoss = Number(before.bodyFatMass) - Number(after.bodyFatMass);

        return {
          rank: 0,
          participant: {
            id: before.participant.id,
            name: before.participant.name,
            phone: before.participant.phone,
          },
          before: {
            weight: Number(before.weight),
            skeletalMuscleMass: Number(before.skeletalMuscleMass),
            bodyFatMass: Number(before.bodyFatMass),
          },
          after: {
            weight: Number(after.weight),
            skeletalMuscleMass: Number(after.skeletalMuscleMass),
            bodyFatMass: Number(after.bodyFatMass),
          },
          metrics: {
            weightChange: Number(after.weight) - Number(before.weight),
            muscleGain,
            fatLoss,
            totalScore: 0,
          },
        };
      })
      .filter((r): r is RankingEntry => r !== null)
      .sort((a, b) => {
        if (b.metrics.fatLoss !== a.metrics.fatLoss) {
          return b.metrics.fatLoss - a.metrics.fatLoss;
        }
        return b.metrics.muscleGain - a.metrics.muscleGain;
      })
      .map((entry, i) => ({
        ...entry,
        rank: i + 1,
        metrics: {
          ...entry.metrics,
          totalScore: entry.metrics.fatLoss * 2 + entry.metrics.muscleGain,
        },
      }));

    return rankings;
  }

  async getCommunicationKingRankings(): Promise<ScoreEntry[]> {
    const scores = await this.scoresRepo.find({
      relations: ['participant'],
    });

    return scores
      .filter((s) => s.communicationScore > 0)
      .map((s) => ({
        rank: 0,
        participant: {
          id: s.participant.id,
          name: s.participant.name,
          phone: s.participant.phone,
        },
        score: s.communicationScore,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }

  async getInspirationKingRankings(): Promise<ScoreEntry[]> {
    const scores = await this.scoresRepo.find({
      relations: ['participant'],
    });

    return scores
      .filter((s) => s.inspirationScore > 0)
      .map((s) => ({
        rank: 0,
        participant: {
          id: s.participant.id,
          name: s.participant.name,
          phone: s.participant.phone,
        },
        score: s.inspirationScore,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }

  async getParticipantRanking(participantId: string): Promise<{
    gainKing: { rank: number; totalScore: number } | null;
    lossKing: { rank: number; totalScore: number } | null;
  }> {
    const [gainKing, lossKing] = await Promise.all([
      this.getGainKingRankings(),
      this.getLossKingRankings(),
    ]);

    const gainKingEntry = gainKing.find((r) => r.participant.id === participantId);
    const lossKingEntry = lossKing.find((r) => r.participant.id === participantId);

    return {
      gainKing: gainKingEntry
        ? { rank: gainKingEntry.rank, totalScore: gainKingEntry.metrics.totalScore }
        : null,
      lossKing: lossKingEntry
        ? { rank: lossKingEntry.rank, totalScore: lossKingEntry.metrics.totalScore }
        : null,
    };
  }
}
