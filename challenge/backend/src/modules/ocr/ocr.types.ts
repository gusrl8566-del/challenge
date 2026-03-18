export interface InbodyOcrResult {
  basic_info: {
    id: string | null;
    age: string | null;
    gender: string | null;
    height_cm: string | null;
    date: string | null;
    time: string | null;
  };
  body_composition: {
    total_body_water_kg: string | null;
    protein_kg: string | null;
    mineral_kg: string | null;
    body_fat_mass_kg: string | null;
    soft_lean_mass_kg: string | null;
    fat_free_mass_kg: string | null;
  };
  muscle_fat_analysis: {
    weight_kg: string | null;
    skeletal_muscle_mass_kg: string | null;
    body_fat_mass_kg: string | null;
  };
  obesity_analysis: {
    bmi: string | null;
    body_fat_percentage: string | null;
  };
  segmental_lean: {
    left_arm_kg: string | null;
    right_arm_kg: string | null;
    trunk_kg: string | null;
    left_leg_kg: string | null;
    right_leg_kg: string | null;
  };
  segmental_fat: {
    left_arm: string | null;
    right_arm: string | null;
    trunk: string | null;
    left_leg: string | null;
    right_leg: string | null;
  };
  additional_metrics: {
    visceral_fat_level: string | null;
    waist_hip_ratio: string | null;
    fitness_score: string | null;
    bmr_kcal: string | null;
  };
  weight_control: {
    target_weight_change_kg: string | null;
    fat_control_kg: string | null;
    muscle_control_kg: string | null;
  };
}

export interface ImageProcessingOptions {
  resize?: { width: number; height: number };
  normalize?: boolean;
  grayscale?: boolean;
  quality?: number;
}
