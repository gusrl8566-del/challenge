import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { cv } from 'opencv-wasm';
import { UploadsService } from '../uploads/uploads.service';

type FieldKey = 'weight' | 'skeletalMuscleMass' | 'bodyFatMass';
type PhaseKey = 'before' | 'after';
type SourceKind = 'original' | 'normalized';

type ParsedInbodyMetrics = {
  before: {
    weight: number | null;
    skeletalMuscleMass: number | null;
    bodyFatMass: number | null;
  };
  after: {
    weight: number | null;
    skeletalMuscleMass: number | null;
    bodyFatMass: number | null;
  };
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OcrTextResponse = {
  beforeText: string;
  afterText: string;
};

type SingleOcrTextResponse = {
  text: string;
};

type SourceImages = {
  source: SourceKind;
  beforeDataUrl: string;
  afterDataUrl: string;
};

type OcrRun = {
  source: SourceKind;
  attempt: number;
  beforeText: string;
  afterText: string;
  parsed: ParsedRowsByPhase;
};

type RowExtraction = {
  line: string | null;
  numericCandidates: number[];
  selected: number | null;
};

type ParsedRowsByPhase = Record<PhaseKey, Record<FieldKey, RowExtraction>>;

type ValueCandidate = {
  value: number;
  source: SourceKind;
  attempt: number;
  line: string | null;
};

type FieldSelection = {
  value: number | null;
  source: SourceKind | null;
};

const STANDARD_WIDTH = 1000;
const MAX_DESKEW_ANGLE = 12;
const ONE_DECIMAL_PATTERN = /^\d{2,3}\.\d$/;
const OCR_TIMEOUT_MS = 10000;
const OCR_FALLBACK_TIMEOUT_MS = 22000;

const FIELD_RANGES: Record<FieldKey, { min: number; max: number }> = {
  weight: { min: 30, max: 200 },
  skeletalMuscleMass: { min: 10, max: 60 },
  bodyFatMass: { min: 5, max: 60 },
};

@Injectable()
export class OpenAiOcrService {
  constructor(
    private readonly configService: ConfigService,
    private readonly uploadsService: UploadsService,
  ) {}

  async parseInbodyImages(
    beforeImageUrl: string,
    afterImageUrl: string,
  ): Promise<{ metrics: ParsedInbodyMetrics; model: string }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('OPENAI_OCR_MODEL', 'gpt-4o-mini');

    const beforeFilePath = this.resolveImageFilePath(beforeImageUrl);
    const afterFilePath = this.resolveImageFilePath(afterImageUrl);

    const beforeOriginal = fs.readFileSync(beforeFilePath);
    const afterOriginal = fs.readFileSync(afterFilePath);

    const runs: OcrRun[] = [];

    const originalResult = await this.requestOcrText(
      apiKey,
      model,
      this.toJpegDataUrl(beforeOriginal),
      this.toJpegDataUrl(afterOriginal),
    );
    runs.push({
      source: 'original',
      attempt: 1,
      beforeText: originalResult.beforeText,
      afterText: originalResult.afterText,
      parsed: {
        before: this.parseRowsFromText(originalResult.beforeText, 'before'),
        after: this.parseRowsFromText(originalResult.afterText, 'after'),
      },
    });

    const originalSelections = this.selectFinalValues(runs);
    const originalMetrics = this.toMetrics(originalSelections);

    if (!this.hasMissingMetric(originalMetrics.before) && !this.hasMissingMetric(originalMetrics.after)) {
      await this.saveRawOcrText(runs);
      await this.saveRowParseDebug(runs, originalSelections, originalMetrics);
      return { model, metrics: originalMetrics };
    }

    const beforeNormalized = await this.normalizePhoto(beforeFilePath);
    const afterNormalized = await this.normalizePhoto(afterFilePath);

    await this.saveDebugNormalizedImage('before', beforeNormalized);
    await this.saveDebugNormalizedImage('after', afterNormalized);

    const normalizedResult = await this.requestOcrText(
      apiKey,
      model,
      this.toJpegDataUrl(beforeNormalized),
      this.toJpegDataUrl(afterNormalized),
    );

    runs.push({
      source: 'normalized',
      attempt: 1,
      beforeText: normalizedResult.beforeText,
      afterText: normalizedResult.afterText,
      parsed: {
        before: this.parseRowsFromText(normalizedResult.beforeText, 'before'),
        after: this.parseRowsFromText(normalizedResult.afterText, 'after'),
      },
    });

    const selections = this.selectFinalValues(runs);
    const metrics = this.toMetrics(selections);

    await this.saveRawOcrText(runs);
    await this.saveRowParseDebug(runs, selections, metrics);

    return {
      model,
      metrics,
    };
  }

  async parseSingleInbodyImage(
    imageUrl: string,
  ): Promise<{
    metrics: {
      weight: number | null;
      skeletalMuscleMass: number | null;
      bodyFatMass: number | null;
    };
    model: string;
    ocrMode: 'fast' | 'fallback' | 'fast-failed';
  }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('OPENAI_OCR_MODEL_SINGLE', 'gpt-4o-mini');
    const imageFilePath = this.resolveImageFilePath(imageUrl);
    const fastImage = await this.prepareFastOcrImage(imageFilePath);

    let fastMetrics = {
      weight: null as number | null,
      skeletalMuscleMass: null as number | null,
      bodyFatMass: null as number | null,
    };
    let fastReliable = false;

    try {
      const originalText = await this.requestSingleImageOcrText(
        apiKey,
        model,
        this.toJpegDataUrl(fastImage),
        'low',
      );
      const fastParsed = this.extractSingleParseFromText(originalText);
      fastMetrics = fastParsed.metrics;
      fastReliable = fastParsed.reliable;
    } catch {
      return {
        model,
        ocrMode: 'fast-failed',
        metrics: {
          weight: null,
          skeletalMuscleMass: null,
          bodyFatMass: null,
        },
      };
    }

    const shouldFallback = this.hasMissingMetric(fastMetrics) || !fastReliable;
    if (!shouldFallback) {
      return { model, ocrMode: 'fast', metrics: fastMetrics };
    }

    try {
      const normalized = await this.normalizePhoto(imageFilePath);
      await this.saveDebugNormalizedImage('before', normalized);

      const fallbackText = await this.requestSingleImageOcrText(
        apiKey,
        model,
        this.toJpegDataUrl(normalized),
        'high',
        OCR_FALLBACK_TIMEOUT_MS,
      );

      const fallbackParsed = this.extractSingleParseFromText(fallbackText);
      const fallbackMetrics = fallbackParsed.metrics;

      return {
        model,
        ocrMode: 'fallback',
        metrics: {
          weight: fallbackMetrics.weight ?? fastMetrics.weight,
          skeletalMuscleMass:
            fallbackMetrics.skeletalMuscleMass ?? fastMetrics.skeletalMuscleMass,
          bodyFatMass: fallbackMetrics.bodyFatMass ?? fastMetrics.bodyFatMass,
        },
      };
    } catch {
      return { model, ocrMode: 'fast', metrics: fastMetrics };
    }
  }

  private async requestOcrText(
    apiKey: string,
    model: string,
    beforeImageDataUrl: string,
    afterImageDataUrl: string,
  ): Promise<OcrTextResponse> {
    const response = await this.fetchOpenAi(apiKey, {
      model,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'inbody_ocr_text',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['beforeText', 'afterText'],
            properties: {
              beforeText: { type: 'string' },
              afterText: { type: 'string' },
            },
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'OCR the full InBody report image and return raw text with original line breaks. Do not summarize or normalize labels.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'First image is BEFORE report photo and second image is AFTER report photo. Return complete OCR text for each image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: beforeImageDataUrl,
                detail: 'auto',
              },
            },
            {
              type: 'image_url',
              image_url: {
                url: afterImageDataUrl,
                detail: 'auto',
              },
            },
          ],
        },
      ],
    });

    const data = (await response.json()) as OpenAiResponse;
    if (!response.ok) {
      throw new InternalServerErrorException(
        data.error?.message || 'OpenAI OCR request failed',
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('OpenAI OCR response is empty');
    }

    try {
      return JSON.parse(content) as OcrTextResponse;
    } catch {
      throw new InternalServerErrorException('Failed to parse OpenAI OCR response');
    }
  }

  private async requestSingleImageOcrText(
    apiKey: string,
    model: string,
    imageDataUrl: string,
    detail: 'low' | 'high' | 'auto' = 'low',
    timeoutMs = OCR_TIMEOUT_MS,
  ): Promise<string> {
    const response = await this.fetchOpenAi(apiKey, {
      model,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'inbody_single_ocr_text',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['text'],
            properties: {
              text: { type: 'string' },
            },
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            'OCR the full InBody report image and return only raw text with original line breaks. Do not summarize labels.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Return complete OCR text for this single InBody report image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail,
              },
            },
          ],
        },
      ],
    }, timeoutMs);

    const data = (await response.json()) as OpenAiResponse;
    if (!response.ok) {
      throw new InternalServerErrorException(
        data.error?.message || 'OpenAI OCR request failed',
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new InternalServerErrorException('OpenAI OCR response is empty');
    }

    try {
      const parsed = JSON.parse(content) as SingleOcrTextResponse;
      return parsed.text;
    } catch {
      throw new InternalServerErrorException('Failed to parse OpenAI OCR response');
    }
  }

  private async fetchOpenAi(
    apiKey: string,
    body: Record<string, unknown>,
    timeoutMs = OCR_TIMEOUT_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new InternalServerErrorException('OpenAI OCR request timed out or failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseRowsFromText(text: string, phase: PhaseKey): Record<FieldKey, RowExtraction> {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return {
      weight: this.extractFieldLine(lines, 'weight', phase),
      skeletalMuscleMass: this.extractFieldLine(lines, 'skeletalMuscleMass', phase),
      bodyFatMass: this.extractFieldLine(lines, 'bodyFatMass', phase),
    };
  }

  private extractFieldLine(
    lines: string[],
    field: FieldKey,
    phase: PhaseKey,
  ): RowExtraction {
    const matching = lines.filter((line) => this.isFieldLine(line, field));
    if (matching.length === 0) {
      return { line: null, numericCandidates: [], selected: null };
    }

    const bestLine = this.pickBestLine(matching);
    const numericCandidates = this.extractNumbersFromLine(bestLine);

    let selected: number | null = null;
    if (numericCandidates.length >= 3) {
      selected = numericCandidates[0] ?? null;
    } else if (numericCandidates.length === 2) {
      selected = phase === 'before' ? numericCandidates[0] ?? null : numericCandidates[1] ?? null;
    } else if (numericCandidates.length === 1) {
      selected = numericCandidates[0] ?? null;
    }

    return {
      line: bestLine,
      numericCandidates,
      selected,
    };
  }

  private pickBestLine(lines: string[]): string {
    const scored = lines.map((line) => ({
      line,
      score: this.scoreLine(line),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.line || lines[0];
  }

  private scoreLine(line: string): number {
    let score = 0;
    const candidates = this.extractNumbersFromLine(line);

    if (candidates.length >= 2) {
      score += 5;
    } else if (candidates.length === 1) {
      score += 2;
    }

    if (/\(kg\)/i.test(line)) {
      score += 2;
    }

    if (/body composition history|신체변화/i.test(line)) {
      score -= 2;
    }

    return score;
  }

  private isFieldLine(line: string, field: FieldKey): boolean {
    const normalized = line.toLowerCase().replace(/\s+/g, '');

    if (
      normalized.includes('체지방률') ||
      normalized.includes('bodyfat%') ||
      normalized.includes('fat%')
    ) {
      return false;
    }

    if (field === 'weight') {
      return normalized.includes('체중') || normalized.includes('weight');
    }

    if (field === 'skeletalMuscleMass') {
      return (
        normalized.includes('골격근량') ||
        normalized.includes('skeletalmusclemass') ||
        normalized.includes('smm')
      );
    }

    return normalized.includes('체지방량') || normalized.includes('bodyfatmass');
  }

  private extractNumbersFromLine(line: string): number[] {
    const withoutParens = line.replace(/\([^)]*\)/g, ' ');
    const cleaned = withoutParens.replace(/kg/gi, '').replace(/,/g, ' ');
    const matches = cleaned.match(/\d+(?:\.\d+)?/g);

    if (!matches) {
      return [];
    }

    return matches
      .filter((token) => ONE_DECIMAL_PATTERN.test(token))
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value));
  }

  private selectFinalValues(
    runs: OcrRun[],
  ): Record<PhaseKey, Record<FieldKey, FieldSelection>> {
    return {
      before: {
        weight: this.selectFieldValue(runs, 'before', 'weight'),
        skeletalMuscleMass: this.selectFieldValue(runs, 'before', 'skeletalMuscleMass'),
        bodyFatMass: this.selectFieldValue(runs, 'before', 'bodyFatMass'),
      },
      after: {
        weight: this.selectFieldValue(runs, 'after', 'weight'),
        skeletalMuscleMass: this.selectFieldValue(runs, 'after', 'skeletalMuscleMass'),
        bodyFatMass: this.selectFieldValue(runs, 'after', 'bodyFatMass'),
      },
    };
  }

  private selectFieldValue(
    runs: OcrRun[],
    phase: PhaseKey,
    field: FieldKey,
  ): FieldSelection {
    const candidates: ValueCandidate[] = runs
      .map((run) => ({
        value: run.parsed[phase][field].selected,
        source: run.source,
        attempt: run.attempt,
        line: run.parsed[phase][field].line,
      }))
      .filter((item): item is ValueCandidate => item.value !== null)
      .map((item) => ({
        ...item,
        value: this.roundToSingleDecimal(item.value),
      }))
      .filter((item) => this.isInRange(item.value, field));

    if (candidates.length === 0) {
      return { value: null, source: null };
    }

    const grouped = new Map<string, { count: number; sources: Set<SourceKind> }>();
    for (const candidate of candidates) {
      const key = candidate.value.toFixed(1);
      if (!grouped.has(key)) {
        grouped.set(key, { count: 0, sources: new Set<SourceKind>() });
      }

      const entry = grouped.get(key);
      if (entry) {
        entry.count += 1;
        entry.sources.add(candidate.source);
      }
    }

    let selectedKey: string | null = null;
    let selectedCount = -1;
    let selectedSourceCoverage = -1;

    for (const [key, entry] of grouped.entries()) {
      const sourceCoverage = entry.sources.size;
      if (
        entry.count > selectedCount ||
        (entry.count === selectedCount && sourceCoverage > selectedSourceCoverage)
      ) {
        selectedKey = key;
        selectedCount = entry.count;
        selectedSourceCoverage = sourceCoverage;
      }
    }

    if (!selectedKey) {
      return { value: null, source: null };
    }

    const selectedValue = Number(selectedKey);
    const selectedCandidates = candidates.filter(
      (candidate) => candidate.value.toFixed(1) === selectedKey,
    );
    const selectedSource = selectedCandidates.some((candidate) => candidate.source === 'original')
      ? 'original'
      : 'normalized';

    return {
      value: selectedValue,
      source: selectedSource,
    };
  }

  private toMetrics(
    selections: Record<PhaseKey, Record<FieldKey, FieldSelection>>,
  ): ParsedInbodyMetrics {
    return {
      before: {
        weight: selections.before.weight.value,
        skeletalMuscleMass: selections.before.skeletalMuscleMass.value,
        bodyFatMass: selections.before.bodyFatMass.value,
      },
      after: {
        weight: selections.after.weight.value,
        skeletalMuscleMass: selections.after.skeletalMuscleMass.value,
        bodyFatMass: selections.after.bodyFatMass.value,
      },
    };
  }

  private extractSingleParseFromText(text: string): {
    metrics: {
      weight: number | null;
      skeletalMuscleMass: number | null;
      bodyFatMass: number | null;
    };
    reliable: boolean;
  } {
    const parsed = this.parseRowsFromText(text, 'before');

    const metrics = {
      weight: this.sanitizeMetricValue(parsed.weight.selected, 'weight'),
      skeletalMuscleMass: this.sanitizeMetricValue(
        parsed.skeletalMuscleMass.selected,
        'skeletalMuscleMass',
      ),
      bodyFatMass: this.sanitizeMetricValue(parsed.bodyFatMass.selected, 'bodyFatMass'),
    };

    const reliable =
      parsed.weight.line !== null &&
      parsed.skeletalMuscleMass.line !== null &&
      parsed.bodyFatMass.line !== null &&
      parsed.weight.numericCandidates.length > 0 &&
      parsed.weight.numericCandidates.length <= 2 &&
      parsed.skeletalMuscleMass.numericCandidates.length > 0 &&
      parsed.skeletalMuscleMass.numericCandidates.length <= 2 &&
      parsed.bodyFatMass.numericCandidates.length > 0 &&
      parsed.bodyFatMass.numericCandidates.length <= 2;

    return {
      metrics,
      reliable,
    };
  }

  private sanitizeMetricValue(value: number | null, field: FieldKey): number | null {
    if (value === null) {
      return null;
    }

    const rounded = this.roundToSingleDecimal(value);
    return this.isInRange(rounded, field) ? rounded : null;
  }

  private hasMissingMetric(metrics: {
    weight: number | null;
    skeletalMuscleMass: number | null;
    bodyFatMass: number | null;
  }): boolean {
    return (
      metrics.weight === null ||
      metrics.skeletalMuscleMass === null ||
      metrics.bodyFatMass === null
    );
  }

  private roundToSingleDecimal(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
  }

  private isInRange(value: number, field: FieldKey): boolean {
    const range = FIELD_RANGES[field];
    return value >= range.min && value <= range.max;
  }

  private async loadNormalizedImageAsBuffer(filePath: string): Promise<Buffer> {
    return this.normalizePhoto(filePath);
  }

  private async normalizePhoto(filePath: string): Promise<Buffer> {
    try {
      const { data, info } = await sharp(filePath)
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const source = cv.matFromArray(info.height, info.width, cv.CV_8UC4, Array.from(data));
      const oriented = new cv.Mat();
      const gray = new cv.Mat();
      const deskewed = new cv.Mat();

      try {
        if (source.cols > source.rows) {
          cv.rotate(source, oriented, cv.ROTATE_90_COUNTERCLOCKWISE);
        } else {
          source.copyTo(oriented);
        }

        cv.cvtColor(oriented, gray, cv.COLOR_RGBA2GRAY, 0);
        const angle = this.detectDeskewAngle(gray);

        if (Math.abs(angle) > 0.1) {
          const center = new cv.Point(oriented.cols / 2, oriented.rows / 2);
          const rotationMatrix = cv.getRotationMatrix2D(center, angle, 1);
          cv.warpAffine(
            oriented,
            deskewed,
            rotationMatrix,
            new cv.Size(oriented.cols, oriented.rows),
            cv.INTER_LINEAR,
            cv.BORDER_CONSTANT,
            new cv.Scalar(255, 255, 255, 255),
          );
          rotationMatrix.delete();
        } else {
          oriented.copyTo(deskewed);
        }

        return await sharp(Buffer.from(deskewed.data), {
          raw: {
            width: deskewed.cols,
            height: deskewed.rows,
            channels: 4,
          },
        })
          .resize(STANDARD_WIDTH, null, { fit: 'inside', withoutEnlargement: false })
          .jpeg({ quality: 95 })
          .toBuffer();
      } finally {
        source.delete();
        oriented.delete();
        gray.delete();
        deskewed.delete();
      }
    } catch {
      throw new InternalServerErrorException('Failed to normalize InBody image');
    }
  }

  private async prepareFastOcrImage(filePath: string): Promise<Buffer> {
    try {
      return await sharp(filePath)
        .rotate()
        .resize(STANDARD_WIDTH, null, { fit: 'inside', withoutEnlargement: false })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch {
      throw new InternalServerErrorException('Failed to prepare InBody image');
    }
  }

  private detectDeskewAngle(gray: any): number {
    const bw = new cv.Mat();
    const inverted = new cv.Mat();

    try {
      cv.threshold(gray, bw, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.bitwise_not(bw, inverted);
      const points = (cv as any).findNonZero(inverted);

      if (!points || points.rows < 100) {
        if (points) {
          points.delete();
        }
        return 0;
      }

      const rect = cv.minAreaRect(points);
      points.delete();

      let angle = rect.angle as number;
      if (angle < -45) {
        angle += 90;
      }
      if (angle > 45) {
        angle -= 90;
      }

      if (Math.abs(angle) > MAX_DESKEW_ANGLE) {
        return 0;
      }

      return angle;
    } catch {
      return 0;
    } finally {
      bw.delete();
      inverted.delete();
    }
  }

  private resolveImageFilePath(imageUrl: string): string {
    const uploadDir = this.uploadsService.getUploadDir();
    const filename = this.extractFilename(imageUrl);
    const filePath = join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`Image file not found: ${filename}`);
    }

    return filePath;
  }

  private extractFilename(imageUrl: string): string {
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }

    const normalized = imageUrl.split('?')[0];
    const segments = normalized.split('/').filter(Boolean);
    const filename = segments[segments.length - 1];

    if (!filename) {
      throw new BadRequestException('Invalid imageUrl');
    }

    return filename;
  }

  private toJpegDataUrl(buffer: Buffer): string {
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  private async saveDebugNormalizedImage(phase: PhaseKey, buffer: Buffer): Promise<void> {
    const debugDir = this.getDebugDir();
    await sharp(buffer)
      .jpeg({ quality: 95 })
      .toFile(join(debugDir, `${phase}_normalized.jpg`));
  }

  private async saveRawOcrText(runs: OcrRun[]): Promise<void> {
    const debugDir = this.getDebugDir();
    const blocks: string[] = [];

    for (const run of runs) {
      blocks.push(`[source=${run.source} attempt=${run.attempt} phase=before]`);
      blocks.push(run.beforeText);
      blocks.push('');
      blocks.push(`[source=${run.source} attempt=${run.attempt} phase=after]`);
      blocks.push(run.afterText);
      blocks.push('');
    }

    fs.writeFileSync(join(debugDir, 'ocr_raw_text.txt'), blocks.join('\n'));
  }

  private async saveRowParseDebug(
    runs: OcrRun[],
    selections: Record<PhaseKey, Record<FieldKey, FieldSelection>>,
    metrics: ParsedInbodyMetrics,
  ): Promise<void> {
    const debugDir = this.getDebugDir();

    const candidateSummary: Record<PhaseKey, Record<FieldKey, Array<{
      source: SourceKind;
      attempt: number;
      line: string | null;
      numericCandidates: number[];
      selected: number | null;
    }>>> = {
      before: {
        weight: [],
        skeletalMuscleMass: [],
        bodyFatMass: [],
      },
      after: {
        weight: [],
        skeletalMuscleMass: [],
        bodyFatMass: [],
      },
    };

    for (const run of runs) {
      (['before', 'after'] as PhaseKey[]).forEach((phase) => {
        (['weight', 'skeletalMuscleMass', 'bodyFatMass'] as FieldKey[]).forEach((field) => {
          const parsed = run.parsed[phase][field];
          candidateSummary[phase][field].push({
            source: run.source,
            attempt: run.attempt,
            line: parsed.line,
            numericCandidates: parsed.numericCandidates,
            selected: parsed.selected,
          });
        });
      });
    }

    const payload = {
      regex: ONE_DECIMAL_PATTERN.source,
      ranges: FIELD_RANGES,
      candidates: candidateSummary,
      selected: {
        before: {
          weight: selections.before.weight,
          smm: selections.before.skeletalMuscleMass,
          fat: selections.before.bodyFatMass,
        },
        after: {
          weight: selections.after.weight,
          smm: selections.after.skeletalMuscleMass,
          fat: selections.after.bodyFatMass,
        },
      },
      finalMetrics: metrics,
    };

    fs.writeFileSync(join(debugDir, 'row_parse_debug.json'), JSON.stringify(payload, null, 2));
  }

  private getDebugDir(): string {
    const debugDir = join(this.uploadsService.getUploadDir(), 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    return debugDir;
  }
}
