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

export enum InbodyImageType {
  BEFORE = 'before',
  AFTER = 'after',
}

@Entity('inbody_data')
export class InbodyData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  participantId: string;

  @OneToOne(() => Participant, (participant) => participant.inbodyData)
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  beforeWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  beforeSkeletalMuscleMass: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  beforeBodyFatMass: number;

  @Column({ nullable: true })
  beforeImageUrl: string;

  @Column({ nullable: true })
  beforeImageFilename: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  afterWeight: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  afterSkeletalMuscleMass: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  afterBodyFatMass: number;

  @Column({ nullable: true })
  afterImageUrl: string;

  @Column({ nullable: true })
  afterImageFilename: string;

  @Column({ default: false })
  beforeVerified: boolean;

  @Column({ default: false })
  afterVerified: boolean;

  @Column({ nullable: true })
  submittedAt: Date;

  @Column({ type: 'int', default: 0 })
  editCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
