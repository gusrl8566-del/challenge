import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { RankingsService } from './rankings.service';
import { RankingsController } from './rankings.controller';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, InbodyData]), ChallengeStatusModule],
  providers: [RankingsService],
  controllers: [RankingsController],
  exports: [RankingsService],
})
export class RankingsModule {}
