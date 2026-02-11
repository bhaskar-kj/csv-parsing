import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { EncountersRepository } from './encounters.repository';
import { DataSource } from 'typeorm';

interface RejectionDetail {
  row: number;
  data: Record<string, any>;
  reason: string;
}

export interface CsvUploadResult {
  inserted: number;
  rejected: number;
  rejections: RejectionDetail[];
}

@Injectable()
export class EncountersService {
  private readonly logger = new Logger(EncountersService.name);

  constructor(
    private readonly encountersRepository: EncountersRepository,
    private readonly dataSource: DataSource,
  ) {}

  async processCSVUpload(buffer: Buffer): Promise<CsvUploadResult> {
    // Step 1: Parse CSV
    let parsedRecords: any[];
    try {
      parsedRecords = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (error) {
      this.logger.error('CSV parsing failed', error);
      throw new BadRequestException('Invalid CSV format');
    }

    if (parsedRecords.length === 0) {
      return { inserted: 0, rejected: 0, rejections: [] };
    }

    this.logger.log(`Processing ${parsedRecords.length} CSV rows`);

    // Step 2: Validate all records (in memory)
    const { validRecords, rejections } = this.validateRecords(parsedRecords);

    if (validRecords.length === 0) {
      this.logger.warn('No valid records to insert');
      return { inserted: 0, rejected: rejections.length, rejections };
    }

    // Step 3: Check for duplicates in batch (single query)
    const visitNumbers = validRecords.map((r) => r.data.visit_number);
    const existingVisitNumbers =
      await this.encountersRepository.findDuplicateVisitNumbers(visitNumbers);
    const duplicateSet = new Set(existingVisitNumbers);

    this.logger.log(`Found ${duplicateSet.size} duplicate visit numbers`);

    // Step 4: Filter out duplicates
    const toInsert: any[] = [];
    validRecords.forEach((record) => {
      if (duplicateSet.has(record.data.visit_number)) {
        rejections.push({
          row: record.row,
          data: record.data,
          reason: 'Duplicate visit_number',
        });
      } else {
        toInsert.push(record.data);
      }
    });

    // Step 5: Bulk insert in transaction (single query)
    let inserted = 0;
    if (toInsert.length > 0) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.encountersRepository.bulkInsertEncounters(toInsert);
        await queryRunner.commitTransaction();
        inserted = toInsert.length;
        this.logger.log(`Successfully inserted ${inserted} records`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error('Bulk insert failed, transaction rolled back', error);
        throw new BadRequestException('Database insertion failed');
      } finally {
        await queryRunner.release();
      }
    }

    return {
      inserted,
      rejected: rejections.length,
      rejections,
    };
  }

  private validateRecords(parsedRecords: any[]): {
    validRecords: Array<{ row: number; data: any }>;
    rejections: RejectionDetail[];
  } {
    const validRecords: Array<{ row: number; data: any }> = [];
    const rejections: RejectionDetail[] = [];

    parsedRecords.forEach((data, index) => {
      const rowNumber = index + 1;
      const validationError = this.validateRow(data);

      if (validationError) {
        rejections.push({
          row: rowNumber,
          data,
          reason: validationError,
        });
      } else {
        validRecords.push({ row: rowNumber, data });
      }
    });

    return { validRecords, rejections };
  }

  private validateRow(data: any): string | null {
    // Check required fields
    if (!data.patient_id || !data.visit_number || !data.visit_type || !data.admitted_at) {
      return 'Missing required field (patient_id, visit_number, visit_type, or admitted_at)';
    }

    return null;
  }

}
