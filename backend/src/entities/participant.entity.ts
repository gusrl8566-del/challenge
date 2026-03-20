import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Score } from './score.entity';
import { InbodyData } from './inbody-data.entity';
import { ChallengeSeason } from './challenge-season.entity';

export enum ParticipantRole {
  PARTICIPANT = 'participant',
  ADMIN = 'admin',
}

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  teamName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sponsorName: string | null;

  @Column({ type: 'varchar', nullable: true })
  seasonId: string | null;

  @ManyToOne(() => ChallengeSeason, { nullable: true })
  @JoinColumn({ name: 'seasonId' })
  season: ChallengeSeason | null;

  @Column({ type: 'varchar', default: ParticipantRole.PARTICIPANT })
  role: ParticipantRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  communicationScore: number;

  @Column({ type: 'integer', default: 0 })
  inspirationScore: number;

  @OneToOne(() => InbodyData, (inbodyData) => inbodyData.participant)
  inbodyData: InbodyData;

  @OneToOne(() => Score, (score) => score.participant)
  @JoinColumn({ name: 'score_id' })
  score: Score;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
