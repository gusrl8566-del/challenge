import { Injectable, NotAcceptableException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;
  private readonly logger = new Logger(UploadsService.name);
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  validateFile(file: Express.Multer.File): void {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new NotAcceptableException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new NotAcceptableException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  generateFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    return `inbody-${timestamp}-${random}${ext}`;
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted file: ${filename}`);
    }
  }

  formatFileResponse(file: Express.Multer.File): UploadedFile {
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: this.getFileUrl(file.filename),
    };
  }
}
