import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class UploadsService {
  private uploadDir: string;

  constructor() {
    const configuredDir = process.env.UPLOAD_DIR || './uploads';
    const fallbackDir = path.resolve(process.cwd(), 'uploads');
    const candidates = [configuredDir, fallbackDir];

    for (const dir of candidates) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        this.uploadDir = dir;
        return;
      } catch {
        continue;
      }
    }

    this.uploadDir = fallbackDir;
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
