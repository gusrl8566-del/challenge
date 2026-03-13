import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { Score } from '../../entities/score.entity';
import { RankingsService } from './rankings.service';
import { RankingsController } from './rankings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, InbodyRecord, Score])],
  providers: [RankingsService],
  controllers: [RankingsController],
  exports: [RankingsService],
})
export class RankingsModule {}
