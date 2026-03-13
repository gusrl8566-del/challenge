export interface InbodyOcrResult {
  weight: number;
  skeletalMuscleMass: number;
  bodyFatMass: number;
  confidence: number;
  rawText: string;
  processedAt: Date;
}

export interface OcrValidationRule {
  field: 'weight' | 'skeletalMuscleMass' | 'bodyFatMass';
  min: number;
  max: number;
}

export const INBODY_VALIDATION_RULES: OcrValidationRule[] = [
  { field: 'weight', min: 20, max: 300 },
  { field: 'skeletalMass', min: 10, max: 150 },
  { field: 'bodyFatMass', min: 1, max: 200 },
];

export interface ImageProcessingOptions {
  resize?: { width: number; height: number };
  normalize?: boolean;
  grayscale?: boolean;
  quality?: number;
}
