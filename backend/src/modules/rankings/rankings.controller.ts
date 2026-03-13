import { Controller, Get, Query } from '@nestjs/common';
import { RankingsService, RankingEntry } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('gain-king')
  async getGainKingRankings(@Query('seasonId') seasonId?: string): Promise<RankingEntry[]> {
    return this.rankingsService.getGainKingRankings(seasonId);
  }

  @Get('loss-king')
  async getLossKingRankings(@Query('seasonId') seasonId?: string): Promise<RankingEntry[]> {
    return this.rankingsService.getLossKingRankings(seasonId);
  }

  @Get('communication-king')
  async getCommunicationKingRankings(@Query('seasonId') seasonId?: string): Promise<RankingEntry[]> {
    return this.rankingsService.getCommunicationKingRankings(seasonId);
  }

  @Get('inspiration-king')
  async getInspirationKingRankings(@Query('seasonId') seasonId?: string): Promise<RankingEntry[]> {
    return this.rankingsService.getInspirationKingRankings(seasonId);
  }

  @Get()
  async getAllRankings(@Query('seasonId') seasonId?: string): Promise<{
    gainKing: RankingEntry[];
    lossKing: RankingEntry[];
    communicationKing: RankingEntry[];
    inspirationKing: RankingEntry[];
  }> {
    const [gainKing, lossKing, communicationKing, inspirationKing] =
      await Promise.all([
        this.rankingsService.getGainKingRankings(seasonId),
        this.rankingsService.getLossKingRankings(seasonId),
        this.rankingsService.getCommunicationKingRankings(seasonId),
        this.rankingsService.getInspirationKingRankings(seasonId),
      ]);

    return {
      gainKing,
      lossKing,
      communicationKing,
      inspirationKing,
    };
  }
}
