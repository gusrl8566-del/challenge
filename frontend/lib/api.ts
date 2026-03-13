import axios from 'axios';
import {
  Participant,
  ParticipantDetail,
  InbodyData,
  Rankings,
  RankingEntry,
  InbodyMetrics,
  ChallengeStatus,
  ChallengeSeason,
} from '@/types';

function resolveApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    return '/api';
  }

  return envUrl || 'https://api.megaworld.store';
}

const API_URL = resolveApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getDirectBackendApiUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return 'https://api.megaworld.store';
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('admin_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export const authApi = {
  register: async (data: { email?: string; phone?: string; password: string; name: string; teamName?: string }) => {
    const response = await api.post<Omit<Participant, 'password'>>('/participants/register', data);
    return response.data;
  },
  
  login: async (data: { loginId: string; password: string }) => {
    const response = await api.post<Omit<Participant, 'password'>>('/participants/login', data);
    return response.data;
  },

  quickAccess: async (data: { name: string; loginId: string }) => {
    const response = await api.post<Omit<Participant, 'password'>>('/participants/quick-access', data);
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get<Participant[]>('/participants');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await api.get<Participant>(`/participants/${id}`);
    return response.data;
  },
};

export const inbodyApi = {
  submit: async (participantId: string, data: { before: InbodyMetrics; after: InbodyMetrics }) => {
    const response = await api.post<InbodyData>(`/inbody-data/${participantId}`, data);
    return response.data;
  },
  
  getByParticipant: async (participantId: string) => {
    const response = await api.get<InbodyData | null>(`/inbody-data/participant/${participantId}`);
    return response.data;
  },
  
  getAll: async (seasonId?: string) => {
    const response = await api.get<InbodyData[]>('/inbody-data', {
      params: seasonId ? { seasonId } : undefined,
    });
    return response.data;
  },
  
  getGains: async (participantId: string) => {
    const response = await api.get<{ weightChange: number; muscleGain: number; fatLoss: number }>(
      `/inbody-data/gains/${participantId}`
    );
    return response.data;
  },

  parseFromImages: async (
    participantId: string,
    data: { beforeImageUrl: string; afterImageUrl: string }
  ) => {
    const response = await api.post<{
      inbodyData: InbodyData;
      extracted: {
        before: InbodyMetrics;
        after: InbodyMetrics;
      };
      model: string;
    }>(`/inbody-data/${participantId}/parse-images`, data);
    return response.data;
  },

  updateImageUrl: async (
    participantId: string,
    data: { imageType: 'before' | 'after'; imageUrl: string; filename?: string }
  ) => {
    const response = await api.post<InbodyData>(`/inbody-data/${participantId}/image-url`, data);
    return response.data;
  },

  parseSingleImage: async (
    participantId: string,
    data: { imageType: 'before' | 'after'; imageUrl: string }
  ) => {
    const directApiUrl = getDirectBackendApiUrl();

    if (!directApiUrl) {
      const response = await api.post<{
        imageType: 'before' | 'after';
        extracted: {
          weight: number | null;
          skeletalMuscleMass: number | null;
          bodyFatMass: number | null;
        };
        model: string;
        ocrMode: 'fast' | 'fallback' | 'fast-failed';
      }>(`/inbody-data/${participantId}/parse-image`, data);
      return response.data;
    }

    const response = await axios.post<{
      imageType: 'before' | 'after';
      extracted: {
        weight: number | null;
        skeletalMuscleMass: number | null;
        bodyFatMass: number | null;
      };
      model: string;
      ocrMode: 'fast' | 'fallback' | 'fast-failed';
    }>(`${directApiUrl}/inbody-data/${participantId}/parse-image`, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 12000,
    });
    return response.data;
  },
};

export const rankingsApi = {
  getGainKing: async () => {
    const response = await api.get<RankingEntry[]>('/rankings/gain-king');
    return response.data;
  },
  
  getLossKing: async () => {
    const response = await api.get<RankingEntry[]>('/rankings/loss-king');
    return response.data;
  },
  
  getCommunicationKing: async () => {
    const response = await api.get<RankingEntry[]>('/rankings/communication-king');
    return response.data;
  },
  
  getInspirationKing: async () => {
    const response = await api.get<RankingEntry[]>('/rankings/inspiration-king');
    return response.data;
  },
  
  getAll: async (seasonId?: string) => {
    const response = await api.get<Rankings>('/rankings', {
      params: seasonId ? { seasonId } : undefined,
    });
    return response.data;
  },
};

export const uploadsApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{ filename: string; url: string }>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const challengeApi = {
  getStatus: async () => {
    const response = await api.get<ChallengeStatus>('/challenge/status');
    return response.data;
  },
};

export const healthApi = {
  getDbStatus: async () => {
    const response = await api.get<{ dbConnected: boolean }>('/health/db');
    return response.data;
  },
};

export const adminApi = {
  updateScores: async (participantId: string, data: { communicationScore: number; inspirationScore: number }) => {
    try {
      const response = await api.post<Participant>('/scores', {
        participantId,
        ...data,
      });
      return response.data;
    } catch {
      const response = await api.put<Participant>(`/admin/participants/${participantId}/scores`, data);
      return response.data;
    }
  },
  
  getAllParticipants: async (seasonId?: string) => {
    const response = await api.get<Participant[]>('/admin/participants', {
      params: seasonId ? { seasonId } : undefined,
    });
    return response.data;
  },
  
  getParticipant: async (id: string) => {
    const response = await api.get<ParticipantDetail>(`/admin/participants/${id}`);
    return response.data;
  },

  recalculateRankings: async () => {
    try {
      const response = await api.post('/recalculate-ranking');
      return response.data;
    } catch {
      const response = await api.get('/rankings');
      return response.data;
    }
  },

  getChallengeStatus: async () => {
    const response = await api.get<ChallengeStatus>('/admin/challenge/status');
    return response.data;
  },

  setChallengeStatus: async (isOpen: boolean) => {
    const response = await api.put<ChallengeStatus>('/admin/challenge/status', { isOpen });
    return response.data;
  },

  getChallengeSeasons: async () => {
    const response = await api.get<ChallengeSeason[]>('/admin/challenge/seasons');
    return response.data;
  },

  createChallengeSeason: async (name: string) => {
    const response = await api.post<ChallengeSeason>('/admin/challenge/seasons', { name });
    return response.data;
  },

  activateChallengeSeason: async (seasonId: string) => {
    const response = await api.put<ChallengeSeason>(`/admin/challenge/seasons/${seasonId}/activate`);
    return response.data;
  },

  updateChallengeSeason: async (seasonId: string, name: string) => {
    const response = await api.put<ChallengeSeason>(`/admin/challenge/seasons/${seasonId}`, {
      name,
    });
    return response.data;
  },
};

export const adminAuthApi = {
  login: async (data: {
    email?: string;
    password?: string;
    super_code: string;
  }) => {
    const response = await api.post<{
      access_token: string;
      token_type: 'Bearer';
      expires_in: string;
      admin: { id: string; email: string; role: string };
    }>('/auth/admin/login', data);

    return response.data;
  },

  validateToken: async () => {
    const response = await api.get<{ valid: boolean }>('/auth/admin/validate');
    return response.data;
  },

  logout: async () => {
    const response = await api.post<{ message: string }>('/auth/admin/logout');
    return response.data;
  },
};

export default api;
