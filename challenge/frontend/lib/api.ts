import axios from 'axios';
import { Participant, InbodyRecord, RankingEntry, Score } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.megaworld.store';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = {
  register: async (data: { name: string; phone: string; password: string }) => {
    const res = await api.post<Participant>('/participants/register', data);
    return res.data;
  },
  login: async (data: { phone: string; password: string }) => {
    const res = await api.post<Participant>('/participants/login', data);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get<Participant[]>('/participants');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Participant>(`/participants/${id}`);
    return res.data;
  },
};

export const inbodyApi = {
  submit: async (participantId: string, data: { phase: string; weight: number; skeletalMuscleMass: number; bodyFatMass: number; imageUrl?: string }) => {
    const res = await api.post<InbodyRecord>(`/inbody-records/${participantId}`, data);
    return res.data;
  },
  getByParticipant: async (participantId: string) => {
    const res = await api.get<InbodyRecord[]>(`/inbody-records/participant/${participantId}`);
    return res.data;
  },
  getGains: async (participantId: string) => {
    const res = await api.get<{ weightChange: number; muscleGain: number; fatLoss: number }>(`/inbody-records/gains/${participantId}`);
    return res.data;
  },
};

export const rankingsApi = {
  getAll: async () => {
    const res = await api.get<any>('/rankings');
    return res.data;
  },
  getGainKing: async () => {
    const res = await api.get<RankingEntry[]>('/rankings/gain-king');
    return res.data;
  },
  getLossKing: async () => {
    const res = await api.get<RankingEntry[]>('/rankings/loss-king');
    return res.data;
  },
  getCommunicationKing: async () => {
    const res = await api.get<RankingEntry[]>('/rankings/communication-king');
    return res.data;
  },
  getInspirationKing: async () => {
    const res = await api.get<RankingEntry[]>('/rankings/inspiration-king');
    return res.data;
  },
  recalculate: async () => {
    const res = await api.post('/rankings/recalculate');
    return res.data;
  },
};

export const uploadsApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post<{ filename: string; url: string }>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const adminApi = {
  updateScores: async (participantId: string, data: { communicationScore?: number; inspirationScore?: number }) => {
    const res = await api.put<Score>(`/admin/participants/${participantId}/scores`, data);
    return res.data;
  },
  getAllParticipants: async () => {
    const res = await api.get<Participant[]>('/admin/participants');
    return res.data;
  },
};

export default api;
