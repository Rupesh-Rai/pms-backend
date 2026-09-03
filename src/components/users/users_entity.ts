import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Roles } from '@/components/roles/roles_entity';

@Entity('users')
export class Users {
  @PrimaryGeneratedColumn('uuid')
  user_id!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fullname?: string;

  @Column({ type: 'varchar', length: 30, nullable: false, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 60, nullable: false, unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: false })
  password!: string;

  // Scalar column for foreign key operations
  @Column({ type: 'uuid', nullable: false })
  role_id!: string;

  // Unidirectional ManyToOne relation
  @ManyToOne(() => Roles, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Roles;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}