import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { InbodyRecord } from './inbody-record.entity';
import { Score } from './score.entity';

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 20, unique: true })
  phone: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'sponsor_name', type: 'varchar', length: 255, nullable: true })
  sponsorName: string | null;

  @OneToMany(() => InbodyRecord, (record) => record.participant)
  inbodyRecords: InbodyRecord[];

  @OneToOne(() => Score, (score) => score.participant)
  @JoinColumn({ name: 'score_id' })
  score: Score;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
