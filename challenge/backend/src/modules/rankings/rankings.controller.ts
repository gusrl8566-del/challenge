import { Controller, Get, Param } from '@nestjs/common';
import { RankingsService, RankingEntry, ScoreEntry, AllRankings } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  async getAllRankings(): Promise<AllRankings> {
    return this.rankingsService.getAllRankings();
  }

  @Get('gain-king')
  async getGainKingRankings(): Promise<RankingEntry[]> {
    return this.rankingsService.getGainKingRankings();
  }

  @Get('loss-king')
  async getLossKingRankings(): Promise<RankingEntry[]> {
    return this.rankingsService.getLossKingRankings();
  }

  @Get('communication-king')
  async getCommunicationKingRankings(): Promise<ScoreEntry[]> {
    return this.rankingsService.getCommunicationKingRankings();
  }

  @Get('inspiration-king')
  async getInspirationKingRankings(): Promise<ScoreEntry[]> {
    return this.rankingsService.getInspirationKingRankings();
  }

  @Get('participant/:id')
  async getParticipantRanking(
    @Param('id') id: string,
  ): Promise<{ gainKing: { rank: number; totalScore: number } | null; lossKing: { rank: number; totalScore: number } | null }> {
    return this.rankingsService.getParticipantRanking(id);
  }
}
