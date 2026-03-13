import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Participant } from './participant.entity';

export enum InbodyPhase {
  BEFORE = 'before',
  AFTER = 'after',
}

@Entity('inbody_records')
@Unique(['participant', 'phase'])
export class InbodyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'participant_id' })
  participantId: string;

  @ManyToOne(() => Participant, (participant) => participant.inbodyRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @Column({
    type: 'varchar',
    length: 10,
    enum: InbodyPhase,
  })
  phase: InbodyPhase;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ name: 'skeletal_muscle_mass', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skeletalMuscleMass: number;

  @Column({ name: 'body_fat_mass', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyFatMass: number;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
