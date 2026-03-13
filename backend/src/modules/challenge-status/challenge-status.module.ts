import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeSeason } from '../../entities/challenge-season.entity';
import { ChallengeStatusService } from './challenge-status.service';
import { ChallengeStatusController } from './challenge-status.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChallengeSeason])],
  providers: [ChallengeStatusService],
  controllers: [ChallengeStatusController],
  exports: [ChallengeStatusService],
})
export class ChallengeStatusModule {}
