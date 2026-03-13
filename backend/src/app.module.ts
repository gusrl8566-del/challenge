import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsModule } from './modules/participants/participants.module';
import { InbodyDataModule } from './modules/inbody-data/inbody-data.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChallengeStatusModule } from './modules/challenge-status/challenge-status.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...(configService.get('DB_TYPE', 'postgres') === 'sqlite'
          ? {
              type: 'sqlite',
              database: configService.get('SQLITE_DATABASE_PATH', 'inbody.sqlite'),
            }
          : {
              type: 'postgres',
              host: configService.get('DATABASE_HOST', 'localhost'),
              port: configService.get<number>('DATABASE_PORT', 5432),
              username: configService.get('DATABASE_USER', 'inbody'),
              password: configService.get('DATABASE_PASSWORD', 'inbody_secret'),
              database: configService.get('DATABASE_NAME', 'inbody_challenge'),
            }),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ParticipantsModule,
    InbodyDataModule,
    RankingsModule,
    AdminModule,
    UploadsModule,
    AuthModule,
    ChallengeStatusModule,
    HealthModule,
  ],
})
export class AppModule {}
