import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from '../entities/participant.entity';
import { InbodyRecord } from '../entities/inbody-record.entity';
import { Score } from '../entities/score.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, InbodyRecord, Score]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
