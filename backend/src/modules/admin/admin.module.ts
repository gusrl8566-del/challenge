import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../../entities/participant.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant]), ChallengeStatusModule],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
