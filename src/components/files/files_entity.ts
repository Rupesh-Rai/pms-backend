import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Users } from '@/components/users/users_entity';
import { Tasks } from '@/components/tasks/tasks_entity';

@Entity('files')
export class Files {
  @PrimaryGeneratedColumn('uuid')
  file_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  file_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type!: string;

  @Column({ type: 'text', nullable: true })
  file_url!: string;

  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Users;

  @Column({ type: 'uuid', nullable: true })
  task_id?: string;

  @ManyToOne(() => Tasks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: Tasks;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}
