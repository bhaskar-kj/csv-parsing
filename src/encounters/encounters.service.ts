import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse';
import { EncountersRepository } from './encounters.repository';

@Injectable()
export class EncountersService {
  constructor(private readonly encountersRepository: EncountersRepository) {}

  async processCSVUpload(buffer: Buffer) {
    const records: any[] = [];
    const rejections: any[] = [];
    let inserted = 0;
    let rowNumber = 1;

    return new Promise((resolve, reject) => {
      const parser = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      parser.on('data', (row) => {
        records.push({ row: rowNumber++, data: row });
      });

      parser.on('error', (error) => {
        reject(new BadRequestException('Invalid CSV format'));
      });

      parser.on('end', async () => {
        for (const { row, data } of records) {
          // Basic validation - check required fields
          if (!data.patient_id || !data.visit_number || !data.visit_type || !data.admitted_at) {
            rejections.push({
              row,
              data,
              reason: 'Missing required field',
            });
            continue;
          }

          // Check duplicate visit_number
          const isDuplicate = await this.encountersRepository.checkDuplicateVisitNumber(data.visit_number);
          if (isDuplicate) {
            rejections.push({
              row,
              data,
              reason: 'Duplicate visit_number',
            });
            continue;
          }

          // Insert valid record
          try {
            await this.encountersRepository.insertEncounter({
              patient_id: data.patient_id,
              visit_number: data.visit_number,
              visit_type: data.visit_type,
              admitted_at: data.admitted_at,
              discharged_at: data.discharged_at || undefined,
            });
            inserted++;
          } catch (error) {
            rejections.push({
              row,
              data,
              reason: 'Database insertion failed',
            });
          }
        }

        resolve({
          inserted,
          rejected: rejections.length,
          rejections,
        });
      });
    });
  }
}
