import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeSeason } from '../../entities/challenge-season.entity';

@Injectable()
export class ChallengeStatusService {
  constructor(
    @InjectRepository(ChallengeSeason)
    private readonly challengeSeasonRepository: Repository<ChallengeSeason>,
  ) {}

  async getStatus(): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    const season = await this.getOrCreateDefaultActiveSeason();
    return {
      isOpen: season?.isOpen ?? false,
      seasonName: season?.name ?? null,
      seasonId: season?.id ?? null,
    };
  }

  async setStatus(isOpen: boolean): Promise<{ isOpen: boolean; seasonName: string | null; seasonId: string | null }> {
    const season = await this.getOrCreateDefaultActiveSeason();
    season.isOpen = isOpen;
    const saved = await this.challengeSeasonRepository.save(season);

    return {
      isOpen: saved.isOpen,
      seasonName: saved.name,
      seasonId: saved.id,
    };
  }

  async createSeason(name: string): Promise<ChallengeSeason> {
    const season = this.challengeSeasonRepository.create({
      name,
      isOpen: false,
      isActive: false,
    });

    return this.challengeSeasonRepository.save(season);
  }

  async listSeasons(): Promise<ChallengeSeason[]> {
    return this.challengeSeasonRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async activateSeason(seasonId: string): Promise<ChallengeSeason> {
    await this.challengeSeasonRepository
      .createQueryBuilder()
      .update(ChallengeSeason)
      .set({ isActive: false, isOpen: false })
      .where('1=1')
      .execute();

    const season = await this.challengeSeasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    season.isActive = true;
    return this.challengeSeasonRepository.save(season);
  }

  async isChallengeOpen(): Promise<boolean> {
    const season = await this.getOrCreateDefaultActiveSeason();
    return season?.isOpen ?? false;
  }

  async updateSeasonName(seasonId: string, name: string): Promise<ChallengeSeason> {
    const season = await this.challengeSeasonRepository.findOne({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException('Season not found');
    }

    season.name = name;
    return this.challengeSeasonRepository.save(season);
  }

  async getActiveSeasonOrDefault(): Promise<ChallengeSeason> {
    return this.getOrCreateDefaultActiveSeason();
  }

  private async getActiveSeason(): Promise<ChallengeSeason | null> {
    return this.challengeSeasonRepository.findOne({ where: { isActive: true } });
  }

  private async getOrCreateDefaultActiveSeason(): Promise<ChallengeSeason> {
    let season = await this.getActiveSeason();

    if (!season) {
      season = this.challengeSeasonRepository.create({
        name: '1기',
        isOpen: false,
        isActive: true,
      });
      season = await this.challengeSeasonRepository.save(season);
    }

    return season;
  }
}
