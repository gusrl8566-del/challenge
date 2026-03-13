import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AdminRole {
  ADMIN = 'admin',
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'varchar', default: AdminRole.ADMIN })
  role: AdminRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
