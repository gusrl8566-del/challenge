import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { ImageProcessingOptions } from './ocr.types';

export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const INBODY_ROI_REGIONS: Record<string, CropRegion> = {
  weight: { left: 0.1, top: 0.15, width: 0.3, height: 0.1 },
  muscle: { left: 0.1, top: 0.28, width: 0.3, height: 0.1 },
  bodyFat: { left: 0.1, top: 0.41, width: 0.3, height: 0.1 },
};

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async preprocessImage(
    inputPath: string,
    options: ImageProcessingOptions = {},
  ): Promise<Buffer> {
    const defaultOptions: ImageProcessingOptions = {
      resize: { width: 1200, height: 1600 },
      normalize: true,
      grayscale: false,
      quality: 90,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    let pipeline = sharp(inputPath);

    if (mergedOptions.resize) {
      pipeline = pipeline.resize(mergedOptions.resize.width, mergedOptions.resize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (mergedOptions.grayscale) {
      pipeline = pipeline.grayscale();
    }

    if (mergedOptions.normalize) {
      pipeline = pipeline.normalize();
    }

    const outputBuffer = await pipeline
      .jpeg({ quality: mergedOptions.quality })
      .toBuffer();

    this.logger.log(`Preprocessed image: ${inputPath} -> ${outputBuffer.length} bytes`);
    return outputBuffer;
  }

  async cropRoi(
    imageBuffer: Buffer,
    region: CropRegion,
    imageWidth: number,
    imageHeight: number,
  ): Promise<Buffer> {
    const left = Math.round(region.left * imageWidth);
    const top = Math.round(region.top * imageHeight);
    const width = Math.round(region.width * imageWidth);
    const height = Math.round(region.height * imageHeight);

    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .resize(800, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    this.logger.debug(`Cropped ROI: ${width}x${height} at (${left}, ${top})`);
    return croppedBuffer;
  }

  async preprocessAndCropRoi(
    inputPath: string,
    roiRegions: Record<string, CropRegion> = INBODY_ROI_REGIONS,
  ): Promise<{ [key: string]: Buffer }> {
    const preprocessedBuffer = await this.preprocessImage(inputPath);
    
    const metadata = await sharp(preprocessedBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 1600;

    const croppedImages: { [key: string]: Buffer } = {};

    for (const [key, region] of Object.entries(roiRegions)) {
      croppedImages[key] = await this.cropRoi(preprocessedBuffer, region, width, height);
    }

    return croppedImages;
  }

  async saveTempImage(buffer: Buffer, prefix: string = 'ocr'): Promise<string> {
    const tempDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const filepath = path.join(tempDir, filename);

    await sharp(buffer).jpeg({ quality: 90 }).toFile(filepath);
    
    this.logger.log(`Saved temp image: ${filepath}`);
    return filepath;
  }

  async cleanupTempImage(filepath: string): Promise<void> {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      this.logger.log(`Cleaned up temp image: ${filepath}`);
    }
  }

  getImageDimensions(base64: string): { width: number; height: number } | null {
    const match = base64.match(/^data:image\/\w+;base64,/);
    if (!match) return null;

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    void Buffer.from(base64Data, 'base64');
    
    return null;
  }
}
