import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsModule } from './modules/participants/participants.module';
import { InbodyRecordsModule } from './modules/inbody-records/inbody-records.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { OcrModule } from './modules/ocr/ocr.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'inbody'),
        password: configService.get('DATABASE_PASSWORD', 'inbody_secret'),
        database: configService.get('DATABASE_NAME', 'inbody_challenge'),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ParticipantsModule,
    InbodyRecordsModule,
    RankingsModule,
    AdminModule,
    UploadsModule,
    OcrModule,
  ],
})
export class AppModule {}
