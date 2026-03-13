import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, InbodyData]), ChallengeStatusModule],
  providers: [ParticipantsService],
  controllers: [ParticipantsController],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
