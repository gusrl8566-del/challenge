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
import { extname } from 'path';
import { UploadsService, UploadedFile as UploadedFileType } from './uploads.service';
import { UploadInbodyImageDto, InbodyPhase } from '../../dto/upload.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  private readonly storage = diskStorage({
    destination: this.uploadsService.getUploadDir(),
    filename: (req, file, cb) => {
      const filename = this.uploadsService.generateFilename(file.originalname);
      cb(null, filename);
    },
  });

  private readonly fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedExtensions = /jpeg|jpg|png|webp/;
    const ext = extname(file.originalname).toLowerCase();
    const mimetype = allowedExtensions.test(file.mimetype);
    const extension = allowedExtensions.test(ext);

    if (mimetype && extension) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files (JPEG, PNG, WEBP) are allowed'), false);
    }
  };

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: this.storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: this.fileFilter,
    }),
  )
  uploadSingleImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInbodyImageDto,
  ): UploadedFileType {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    this.uploadsService.validateFile(file);
    
    const result = this.uploadsService.formatFileResponse(file);
    
    return {
      ...result,
      phase: dto.phase,
    };
  }

  @Post('inbody')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: this.storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: this.fileFilter,
    }),
  )
  uploadInbodyImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadInbodyImageDto,
  ): UploadedFileType {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!dto.phase || !Object.values(InbodyPhase).includes(dto.phase)) {
      throw new BadRequestException('Invalid phase. Must be "before" or "after"');
    }

    this.uploadsService.validateFile(file);
    
    return this.uploadsService.formatFileResponse(file);
  }

  @Post('inbody/batch')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: this.storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: this.fileFilter,
    }),
  )
  uploadInbodyBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { phase: InbodyPhase },
  ): UploadedFileType[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    if (!body.phase || !Object.values(InbodyPhase).includes(body.phase)) {
      throw new BadRequestException('Invalid phase. Must be "before" or "after"');
    }

    return files.map((file) => {
      this.uploadsService.validateFile(file);
      return this.uploadsService.formatFileResponse(file);
    });
  }

  @Post('before-after')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('images', 2, {
      storage: this.storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: this.fileFilter,
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
