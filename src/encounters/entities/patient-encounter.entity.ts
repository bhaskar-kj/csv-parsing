import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('patient_encounters')
export class PatientEncounter {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  patient_id: string;

  @Column({ type: 'varchar', length: 20, nullable: false, unique: true })
  visit_number: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  visit_type: string;

  @Column({ type: 'timestamp', nullable: false })
  admitted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  discharged_at: Date | null;
}
