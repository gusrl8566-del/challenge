import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InbodyRecord } from '../../entities/inbody-record.entity';
import { InbodyRecordsService } from './inbody-records.service';
import { InbodyRecordsController } from './inbody-records.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InbodyRecord])],
  providers: [InbodyRecordsService],
  controllers: [InbodyRecordsController],
  exports: [InbodyRecordsService],
})
export class InbodyRecordsModule {}
