import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Participant } from './participant.entity';

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'participant_id', unique: true })
  participantId: string;

  @OneToOne(() => Participant, (participant) => participant.score)
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @Column({ name: 'communication_score', type: 'integer', default: 0 })
  communicationScore: number;

  @Column({ name: 'inspiration_score', type: 'integer', default: 0 })
  inspirationScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
