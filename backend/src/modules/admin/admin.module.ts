import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../../entities/participant.entity';
import { InbodyData } from '../../entities/inbody-data.entity';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, InbodyData, InbodyRecord]), ChallengeStatusModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
