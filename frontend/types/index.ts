export interface Participant {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  sponsorName: string | null;
  teamName: string | null;
  role: 'participant' | 'admin';
  isActive: boolean;
  communicationScore: number;
  inspirationScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantDetail extends Participant {
  inbodyData?: InbodyData | null;
}

export interface InbodyData {
  id: string;
  participantId: string;
  beforeWeight: number;
  beforeSkeletalMuscleMass: number;
  beforeBodyFatMass: number;
  beforeImageUrl: string;
  beforeImageFilename: string;
  beforeFrontImageUrl?: string | null;
  beforeBackImageUrl?: string | null;
  beforeSideImageUrl?: string | null;
  afterWeight: number;
  afterSkeletalMuscleMass: number;
  afterBodyFatMass: number;
  afterImageUrl: string;
  afterImageFilename: string;
  afterFrontImageUrl?: string | null;
  afterBackImageUrl?: string | null;
  afterSideImageUrl?: string | null;
  beforeVerified: boolean;
  afterVerified: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankingEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    sponsorName: string | null;
    teamName: string | null;
    communicationScore: number;
    inspirationScore: number;
  };
  metrics: {
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
    totalScore: number;
  };
}

export interface Rankings {
  gainKing: RankingEntry[];
  lossKing: RankingEntry[];
  communicationKing: RankingEntry[];
  inspirationKing: RankingEntry[];
}

export interface InbodyMetrics {
  weight: number;
  skeletalMuscleMass: number;
  bodyFatMass: number;
  imageUrl?: string;
}

export interface ChallengeStatus {
  isOpen: boolean;
  seasonName: string | null;
  seasonId: string | null;
}

export interface ChallengeSeason {
  id: string;
  name: string;
  isOpen: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantInbodyOcrResult {
  member_id: string | null;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  body_fat_mass: number | null;
}

export interface ParticipantInbodyRecord {
  id: string;
  memberId: string;
  name: string;
  weight: number;
  skeletalMuscleMass: number;
  bodyFatMass: number;
  recordType: 'start' | 'end';
  imageUrl: string;
  createdAt: string;
}
