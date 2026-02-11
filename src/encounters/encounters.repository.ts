import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PatientEncounter } from './entities/patient-encounter.entity';

@Injectable()
export class EncountersRepository {
  constructor(
    @InjectRepository(PatientEncounter)
    private readonly repository: Repository<PatientEncounter>,
  ) {}

  async checkDuplicateVisitNumber(visitNumber: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { visit_number: visitNumber },
    });
    return count > 0;
  }

  async findDuplicateVisitNumbers(visitNumbers: string[]): Promise<string[]> {
    if (visitNumbers.length === 0) {
      return [];
    }

    const results = await this.repository.find({
      where: { visit_number: In(visitNumbers) },
      select: ['visit_number'],
    });

    return results.map((r) => r.visit_number);
  }

  async insertEncounter(data: any): Promise<PatientEncounter> {
    const encounter = this.repository.create({
      patient_id: data.patient_id,
      visit_number: data.visit_number,
      visit_type: data.visit_type,
      admitted_at: new Date(data.admitted_at),
      discharged_at: data.discharged_at ? new Date(data.discharged_at) : null,
    });
    return this.repository.save(encounter);
  }

  async bulkInsertEncounters(dataArray: any[]): Promise<void> {
    if (dataArray.length === 0) {
      return;
    }

    const encounters = dataArray.map((data) => ({
      patient_id: data.patient_id,
      visit_number: data.visit_number,
      visit_type: data.visit_type,
      admitted_at: new Date(data.admitted_at),
      discharged_at: data.discharged_at ? new Date(data.discharged_at) : null,
    }));

    await this.repository.insert(encounters);
  }
}
