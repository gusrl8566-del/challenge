import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

export enum InbodyRecordType {
  START = 'start',
  END = 'end',
}

@Entity('inbody_records')
@Unique(['seasonId', 'memberId', 'recordType'])
export class InbodyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'season_id', type: 'varchar', nullable: true })
  seasonId: string | null;

  @Column({ name: 'member_id', length: 50 })
  memberId: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    name: 'record_type',
    type: 'varchar',
    length: 10,
    enum: InbodyRecordType,
  })
  recordType: InbodyRecordType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number | null;

  @Column({ name: 'skeletal_muscle_mass', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skeletalMuscleMass: number | null;

  @Column({ name: 'body_fat_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyFatPercent: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
