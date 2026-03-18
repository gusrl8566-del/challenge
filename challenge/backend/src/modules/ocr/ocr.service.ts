import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ImageProcessingService } from './image-processing.service';
import { InbodyOcrResult } from './ocr.types';

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

    const preprocessedImage = await this.imageProcessingService.preprocessImage(imagePath);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.performOcrExtraction(preprocessedImage, attempt);
        this.logger.log(`OCR successful on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Attempt ${attempt} failed: ${lastError.message}`);

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
    imageBuffer: Buffer,
    attempt: number,
  ): Promise<InbodyOcrResult> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'You are an OCR extraction engine. Return only valid JSON.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.buildOcrPrompt(attempt),
            },
            {
              type: 'image_url',
              image_url: { url: this.bufferToDataUrl(imageBuffer) },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    this.logger.debug(`OpenAI response: ${content}`);

    if (!content) {
      throw new Error('Empty response from OCR model');
    }

    return this.parseOcrResponse(content);
  }

  private buildOcrPrompt(attempt: number): string {
    return `이 이미지는 인바디(InBody) 결과지다.

너의 역할:
이미지에서 모든 텍스트와 숫자를 "있는 그대로" 추출하고,
절대 해석하지 말고 구조적으로 정리하는 것이다.

[절대 규칙]
1. 숫자는 절대 수정하거나 추측하지 말 것
2. 잘 안 보이거나 확실하지 않은 값은 null 처리
3. 단위(kg, %, cm, kcal)는 반드시 포함
4. 텍스트를 요약하거나 의미 해석하지 말 것
5. 표에 있는 값은 빠짐없이 포함할 것
6. 같은 항목이 여러 번 나오면 모두 포함할 것
7. 숫자/소수점/기호를 원본 그대로 유지할 것

[출력 형식]
- 반드시 JSON만 출력 (설명 금지)
- 모든 키는 영어 snake_case 사용
- 누락된 값은 빈 문자열이 아니라 null 사용
- attempt: ${attempt}

{
  "basic_info": {
    "id": "",
    "age": "",
    "gender": "",
    "height_cm": "",
    "date": "",
    "time": ""
  },
  "body_composition": {
    "total_body_water_kg": "",
    "protein_kg": "",
    "mineral_kg": "",
    "body_fat_mass_kg": "",
    "soft_lean_mass_kg": "",
    "fat_free_mass_kg": ""
  },
  "muscle_fat_analysis": {
    "weight_kg": "",
    "skeletal_muscle_mass_kg": "",
    "body_fat_mass_kg": ""
  },
  "obesity_analysis": {
    "bmi": "",
    "body_fat_percentage": ""
  },
  "segmental_lean": {
    "left_arm_kg": "",
    "right_arm_kg": "",
    "trunk_kg": "",
    "left_leg_kg": "",
    "right_leg_kg": ""
  },
  "segmental_fat": {
    "left_arm": "",
    "right_arm": "",
    "trunk": "",
    "left_leg": "",
    "right_leg": ""
  },
  "additional_metrics": {
    "visceral_fat_level": "",
    "waist_hip_ratio": "",
    "fitness_score": "",
    "bmr_kcal": ""
  },
  "weight_control": {
    "target_weight_change_kg": "",
    "fat_control_kg": "",
    "muscle_control_kg": ""
  }
}`;
  }

  private bufferToDataUrl(buffer: Buffer): string {
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  private parseOcrResponse(content: string): InbodyOcrResult {
    try {
      const parsed = JSON.parse(content);

      return {
        basic_info: this.normalizeSection(parsed.basic_info, [
          'id',
          'age',
          'gender',
          'height_cm',
          'date',
          'time',
        ]),
        body_composition: this.normalizeSection(parsed.body_composition, [
          'total_body_water_kg',
          'protein_kg',
          'mineral_kg',
          'body_fat_mass_kg',
          'soft_lean_mass_kg',
          'fat_free_mass_kg',
        ]),
        muscle_fat_analysis: this.normalizeSection(parsed.muscle_fat_analysis, [
          'weight_kg',
          'skeletal_muscle_mass_kg',
          'body_fat_mass_kg',
        ]),
        obesity_analysis: this.normalizeSection(parsed.obesity_analysis, [
          'bmi',
          'body_fat_percentage',
        ]),
        segmental_lean: this.normalizeSection(parsed.segmental_lean, [
          'left_arm_kg',
          'right_arm_kg',
          'trunk_kg',
          'left_leg_kg',
          'right_leg_kg',
        ]),
        segmental_fat: this.normalizeSection(parsed.segmental_fat, [
          'left_arm',
          'right_arm',
          'trunk',
          'left_leg',
          'right_leg',
        ]),
        additional_metrics: this.normalizeSection(parsed.additional_metrics, [
          'visceral_fat_level',
          'waist_hip_ratio',
          'fitness_score',
          'bmr_kcal',
        ]),
        weight_control: this.normalizeSection(parsed.weight_control, [
          'target_weight_change_kg',
          'fat_control_kg',
          'muscle_control_kg',
        ]),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      this.logger.error(`Failed to parse OCR response: ${message}`);
      throw new Error(`Invalid JSON response from OCR: ${content}`);
    }
  }

  private normalizeSection<T extends string>(
    section: Record<string, unknown> | null | undefined,
    keys: readonly T[],
  ): Record<T, string | null> {
    const normalized = {} as Record<T, string | null>;

    for (const key of keys) {
      normalized[key] = this.normalizeValue(section?.[key]);
    }

    return normalized;
  }

  private normalizeValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
