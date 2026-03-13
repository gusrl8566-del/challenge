export interface Participant {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface InbodyRecord {
  id: string;
  participantId: string;
  phase: 'before' | 'after';
  weight: number;
  skeletalMuscleMass: number;
  bodyFatMass: number;
  imageUrl: string;
  createdAt: string;
}

export interface Score {
  id: string;
  participantId: string;
  communicationScore: number;
  inspirationScore: number;
}

export interface RankingEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    phone: string;
  };
  before?: {
    weight: number;
    skeletalMuscleMass: number;
    bodyFatMass: number;
  };
  after?: {
    weight: number;
    skeletalMuscleMass: number;
    bodyFatMass: number;
  };
  metrics: {
    weightChange: number;
    muscleGain: number;
    fatLoss: number;
    totalScore: number;
  };
}

export interface ScoreEntry {
  rank: number;
  participant: {
    id: string;
    name: string;
    phone: string;
  };
  score: number;
}

export interface AllRankings {
  gainKing: RankingEntry[];
  lossKing: RankingEntry[];
  communicationKing: ScoreEntry[];
  inspirationKing: ScoreEntry[];
}

export interface ParticipantWithRecords extends Participant {
  inbodyRecords?: InbodyRecord[];
  score?: Score;
}

export interface ParticipantTableData {
  id: string;
  name: string;
  phone: string;
  beforeWeight: number | null;
  afterWeight: number | null;
  muscleGain: number | null;
  fatLoss: number | null;
  gainKingRank: number | null;
  lossKingRank: number | null;
  communicationScore: number;
  inspirationScore: number;
  uploadDate: string | null;
}
