import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InbodyData } from '../../entities/inbody-data.entity';
import { Participant } from '../../entities/participant.entity';
import { InbodyDataService } from './inbody-data.service';
import { InbodyDataController } from './inbody-data.controller';
import { OpenAiOcrService } from './openai-ocr.service';
import { UploadsModule } from '../uploads/uploads.module';
import { ChallengeStatusModule } from '../challenge-status/challenge-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([InbodyData, Participant]), UploadsModule, ChallengeStatusModule],
  providers: [InbodyDataService, OpenAiOcrService],
  controllers: [InbodyDataController],
  exports: [InbodyDataService, OpenAiOcrService],
})
export class InbodyDataModule {}
