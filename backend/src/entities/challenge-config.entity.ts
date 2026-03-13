import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('challenge_config')
export class ChallengeConfig {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ default: false })
  isOpen: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
