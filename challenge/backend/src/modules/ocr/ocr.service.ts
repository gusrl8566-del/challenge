import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ImageProcessingService, INBODY_ROI_REGIONS } from './image-processing.service';
import { InbodyOcrResult, INBODY_VALIDATION_RULES } from './ocr.types';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly openai: OpenAI;
  private readonly maxRetries = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async extractInbodyData(imagePath: string): Promise<InbodyOcrResult> {
    this.logger.log(`Starting OCR extraction for: ${imagePath}`);

    const croppedImages = await this.imageProcessingService.preprocessAndCropRoi(
      imagePath,
      INBODY_ROI_REGIONS,
    );

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.performOcrExtraction(croppedImages, attempt);
        
        if (this.validateResult(result)) {
          this.logger.log(`OCR successful on attempt ${attempt}`);
          return {
            ...result,
            processedAt: new Date(),
          };
        }

        this.logger.warn(`Attempt ${attempt}: Validation failed, retrying...`);
        lastError = new Error('Validation failed: Invalid values');
        
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    throw new HttpException(
      `OCR extraction failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  async extractInbodyDataFromBase64(base64Image: string): Promise<InbodyOcrResult> {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const tempPath = await this.imageProcessingService.saveTempImage(buffer, 'ocr-input');
    
    try {
      return await this.extractInbodyData(tempPath);
    } finally {
      await this.imageProcessingService.cleanupTempImage(tempPath);
    }
  }

  private async performOcrExtraction(
    croppedImages: { [key: string]: Buffer },
    attempt: number,
  ): Promise<Omit<InbodyOcrResult, 'processedAt'>> {
    const prompt = this.buildOcrPrompt(attempt);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert at reading InBody medical analysis reports. 
Extract the following values from the images:
1. Weight (체중) - in kg
2. Skeletal Muscle Mass (근육량) - in kg  
3. Body Fat Mass (체지방량) - in kg

Return ONLY a JSON object with exactly these fields:
{"weight": number, "skeletalMuscleMass": number, "bodyFatMass": number, "confidence": number}

confidence should be 0-1 based on how clearly you can read the values.

If you cannot find a value, return null for that field.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: this.bufferToDataUrl(croppedImages.weight) } },
          { type: 'image_url', image_url: { url: this.bufferToDataUrl(croppedImages.muscle) } },
          { type: 'image_url', image_url: { url: this.bufferToDataUrl(croppedImages.bodyFat) } },
        ],
      },
    ];

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    this.logger.debug(`OpenAI response: ${content}`);

    return this.parseOcrResponse(content);
  }

  private buildOcrPrompt(attempt: number): string {
    if (attempt === 1) {
      return `Extract the weight, skeletal muscle mass, and body fat mass values from these InBody report sections. 
The first image contains Weight, second contains Skeletal Muscle Mass, third contains Body Fat Mass.`;
    }

    return `Retry ${attempt}: Previous extraction had issues. 
Please be more careful to extract:
- Weight from the first image (look for 체중 or Weight)
- Skeletal Muscle Mass from the second image (look for 근육량 or SMM or Skeletal Muscle)
- Body Fat Mass from the third image (look for 체지방량 or Body Fat)

Return the exact numeric values in kg.`;
  }

  private bufferToDataUrl(buffer: Buffer): string {
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  private parseOcrResponse(content: string): Omit<InbodyOcrResult, 'processedAt'> {
    try {
      const parsed = JSON.parse(content);
      
      const result: Omit<InbodyOcrResult, 'processedAt'> = {
        weight: this.extractNumber(parsed.weight),
        skeletalMuscleMass: this.extractNumber(parsed.skeletalMuscleMass),
        bodyFatMass: this.extractNumber(parsed.bodyFatMass),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        rawText: content,
      };

      return result;
    } catch (error) {
      this.logger.error(`Failed to parse OCR response: ${error.message}`);
      throw new Error(`Invalid JSON response from OCR: ${content}`);
    }
  }

  private extractNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private validateResult(result: Omit<InbodyOcrResult, 'processedAt'>): boolean {
    const validations = [
      { field: 'weight', value: result.weight, min: 20, max: 300 },
      { field: 'skeletalMuscleMass', value: result.skeletalMuscleMass, min: 10, max: 150 },
      { field: 'bodyFatMass', value: result.bodyFatMass, min: 1, max: 200 },
    ];

    for (const validation of validations) {
      if (validation.value < validation.min || validation.value > validation.max) {
        this.logger.warn(
          `Validation failed: ${validation.field} = ${validation.value} (valid range: ${validation.min}-${validation.max})`,
        );
        return false;
      }

      if (result.confidence < 0.3) {
        this.logger.warn(`Validation failed: Low confidence = ${result.confidence}`);
        return false;
      }
    }

    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
