import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { InbodyRecordsController } from './inbody-records.controller';
import { InbodyRecordsService } from './inbody-records.service';
import { InbodyDataModule } from '../inbody-data/inbody-data.module';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InbodyRecord]),
    InbodyDataModule,
    ChallengeStatusModule,
  ],
  controllers: [InbodyRecordsController],
  providers: [InbodyRecordsService],
})
export class InbodyRecordsModule {}
