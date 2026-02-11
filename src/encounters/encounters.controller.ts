import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EncountersService } from './encounters.service';

@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(csv)$/)) {
          return callback(
            new BadRequestException('Only CSV files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.encountersService.processCSVUpload(file.buffer);
  }
}
