import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncountersRepository } from './encounters.repository';
import { PatientEncounter } from './entities/patient-encounter.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PatientEncounter])],
  controllers: [EncountersController],
  providers: [EncountersService, EncountersRepository],
})
export class EncountersModule {}
