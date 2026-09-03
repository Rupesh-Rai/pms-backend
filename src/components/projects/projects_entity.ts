import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
export class Projects {
  @PrimaryGeneratedColumn('uuid')
  project_id!: string;

  @Column({ type: 'varchar', length: 30, nullable: false, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  // Scalar UUID array column for PostgreSQL with explicit type mapping
  @Column({ type: 'uuid', array: true, default: '{}' })
  user_ids!: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  start_time?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  end_time?: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}