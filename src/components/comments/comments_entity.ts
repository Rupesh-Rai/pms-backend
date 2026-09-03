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

@Entity('comments')
export class Comments {
  @PrimaryGeneratedColumn('uuid')
  comment_id!: string;

  @Column({ type: 'text', nullable: false })
  comment!: string;

  // Foreign Key Scalar: Stores raw user UUID
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  // Unidirectional ManyToOne Relation: Multiple comments can belong to one User
  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Users;

  // Foreign Key Scalar: Stores raw task UUID
  @Column({ type: 'uuid', nullable: false })
  task_id!: string;

  // Unidirectional ManyToOne Relation: Multiple comments can belong to one Task
  @ManyToOne(() => Tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Tasks;

  // Explicit type for PostgreSQL array column
  @Column({ type: 'text', array: true, default: '{}' })
  supported_files!: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}