import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';
import { UploadsService, UploadedFile as UploadedFileType, resolveUploadDir } from './uploads.service';
import { UploadInbodyImageDto, UploadMultipleImagesDto, InbodyPhase } from '../../dto/upload.dto';
import { ParticipantsService } from '../participants/participants.service';

const uploadStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolveUploadDir();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    cb(null, `inbody-${timestamp}-${random}${ext}`);
  },
});

const uploadFileFilter = (req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const ext = extname(file.originalname).toLowerCase();
  const mimetype = allowedExtensions.test(file.mimetype);
  const extension = allowedExtensions.test(ext);

  if (mimetype && extension) {
    cb(null, true);
    return;
  }

  cb(new BadRequestException('Only image files (JPEG, PNG, WEBP) are allowed'), false);
};

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly participantsService: ParticipantsService,
  ) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: uploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: uploadFileFilter,
    }),
  )
  async uploadSingleImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInbodyImageDto,
  ): Promise<UploadedFileType> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    this.uploadsService.validateFile(file);
    await this.participantsService.updateSponsorName(dto.participantId, dto.sponsorName);
    
    const result = this.uploadsService.formatFileResponse(file);
    
    return {
      ...result,
      participantId: dto.participantId,
      phase: dto.phase,
      sponsorName: dto.sponsorName.trim(),
    };
  }

  @Post('inbody')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: uploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: uploadFileFilter,
    }),
  )
  async uploadInbodyImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInbodyImageDto,
  ): Promise<UploadedFileType> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!dto.phase || !Object.values(InbodyPhase).includes(dto.phase)) {
      throw new BadRequestException('Invalid phase. Must be "before" or "after"');
    }

    this.uploadsService.validateFile(file);
    await this.participantsService.updateSponsorName(dto.participantId, dto.sponsorName);
    
    return {
      ...this.uploadsService.formatFileResponse(file),
      participantId: dto.participantId,
      phase: dto.phase,
      sponsorName: dto.sponsorName.trim(),
    };
  }

  @Post('inbody/batch')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: uploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: uploadFileFilter,
    }),
  )
  async uploadInbodyBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadMultipleImagesDto,
  ): Promise<UploadedFileType[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    if (!body.phase || !Object.values(InbodyPhase).includes(body.phase)) {
      throw new BadRequestException('Invalid phase. Must be "before" or "after"');
    }

    await this.participantsService.updateSponsorName(body.participantId, body.sponsorName);

    return files.map((file) => {
      this.uploadsService.validateFile(file);
      return {
        ...this.uploadsService.formatFileResponse(file),
        participantId: body.participantId,
        phase: body.phase,
        sponsorName: body.sponsorName.trim(),
      };
    });
  }

  @Post('before-after')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('images', 2, {
      storage: uploadStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: uploadFileFilter,
    }),
  )
  uploadBeforeAndAfter(
    @UploadedFiles() files: Express.Multer.File[],
  ): { before: UploadedFileType; after: UploadedFileType } {
    if (!files || files.length !== 2) {
      throw new BadRequestException('Exactly 2 images required (before and after)');
    }

    const validatedFiles = files.map((file) => {
      this.uploadsService.validateFile(file);
      return this.uploadsService.formatFileResponse(file);
    });

    return {
      before: validatedFiles[0],
      after: validatedFiles[1],
    };
  }
}
