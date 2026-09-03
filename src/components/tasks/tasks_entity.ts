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
import { Projects } from '@/components/projects/projects_entity';

export enum Status {
  NotStarted = 'Not-Started',
  InProgress = 'In-Progress',
  Completed = 'Completed',
}

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

@Entity('tasks')
export class Tasks {
  @PrimaryGeneratedColumn('uuid')
  task_id!: string;

  @Column({ type: 'varchar', length: 30, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  // Scalar foreign key for direct UUID assignments
  @Column({ type: 'uuid', nullable: false })
  project_id!: string;

  // Relation mapping to Projects entity
  @ManyToOne(() => Projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Projects;

  // Scalar foreign key for direct UUID assignments
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  // Relation mapping to Users entity
  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: Users;

  @Column({ type: 'timestamp with time zone', nullable: true })
  estimated_start_time?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  estimated_end_time?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actual_start_time?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actual_end_time?: Date;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.Low,
  })
  priority!: Priority;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.NotStarted,
  })
  status!: Status;

  @Column({ type: 'text', array: true, default: '{}' })
  supported_files!: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}