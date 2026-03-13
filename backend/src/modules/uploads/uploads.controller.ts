import {
  Controller,
  ForbiddenException,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { ChallengeStatusService } from '../challenge-status/challenge-status.service';

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly challengeStatusService: ChallengeStatusService,
  ) {}

  private async ensureChallengeOpen(): Promise<void> {
    const isOpen = await this.challengeStatusService.isChallengeOpen();
    if (!isOpen) {
      throw new ForbiddenException('아직은 챌린지에 참가할 수 없습니다.');
    }
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    await this.ensureChallengeOpen();

    return {
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    await this.ensureChallengeOpen();

    return files.map((file) => ({
      filename: file.filename,
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    }));
  }
}
