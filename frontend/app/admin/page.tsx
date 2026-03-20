'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, adminAuthApi, inbodyApi, rankingsApi } from '@/lib/api';
import { ChallengeSeason, ChallengeStatus, InbodyData, Participant, RankingEntry, Rankings } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { clearAdminSession } from '@/lib/admin-auth';
import { exportParticipantsExcel } from '@/lib/excel-export';

type ParticipantTableRow = {
  participant: Participant;
  inbody: InbodyData | null;
  muscleGain: number;
  fatLoss: number;
  gainRank: number | null;
  lossRank: number | null;
  score: number;
};

type SortKey =
  | 'name'
  | 'muscleGain'
  | 'fatLoss'
  | 'score'
  | 'communicationScore'
  | 'inspirationScore';

type SortDirection = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50] as const;
const CANDIDATE_LIMIT = 10;

const emptyRankings: Rankings = {
  gainKing: [],
  lossKing: [],
  communicationKing: [],
  inspirationKing: [],
};

const rankBadgeClass: Record<number, string> = {
  1: 'bg-amber-300 text-amber-900',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-orange-300 text-orange-900',
};

function asNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getRankMap(entries: RankingEntry[]): Map<string, number> {
  return new Map(entries.map((entry) => [entry.participant.id, entry.rank]));
}

function renderRank(rank: number | null) {
  if (!rank) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
        rankBadgeClass[rank] ?? 'bg-gray-200 text-gray-700'
      }`}
    >
      {rank}
    </span>
  );
}

function formatSignedMetric(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatNumber(Math.abs(value))}kg`;
}

function formatParticipantLabel(name: string, sponsorName?: string | null): string {
  const normalizedSponsor = sponsorName?.trim();
  return normalizedSponsor ? `${name}_${normalizedSponsor}` : name;
}

export default function AdminPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inbodyRows, setInbodyRows] = useState<InbodyData[]>([]);
  const [rankings, setRankings] = useState<Rankings>(emptyRankings);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'success' | 'error' | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [seasons, setSeasons] = useState<ChallengeSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [seasonNameInput, setSeasonNameInput] = useState('');
  const [seasonUpdating, setSeasonUpdating] = useState(false);

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<'all' | 'gain' | 'no-gain'>('all');
  const [fatFilter, setFatFilter] = useState<'all' | 'loss' | 'no-loss'>('all');
  const [rankFilter, setRankFilter] = useState<
    'all' | 'top5-any' | 'gain-ranked' | 'loss-ranked'
  >('all');

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);

  const [editScores, setEditScores] = useState<
    Record<string, { communicationScore: number; inspirationScore: number }>
  >({});
  const [savingParticipantId, setSavingParticipantId] = useState<string | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const applyParticipants = (participantsData: Participant[]) => {
    setParticipants(participantsData);
    setEditScores(
      participantsData.reduce<Record<string, { communicationScore: number; inspirationScore: number }>>(
        (acc, participant) => {
          acc[participant.id] = {
            communicationScore: participant.communicationScore || 0,
            inspirationScore: participant.inspirationScore || 0,
          };
          return acc;
        },
        {}
      )
    );
  };

  const loadSeasonScopedData = async (seasonId: string | null) => {
    const [participantsData, inbodyData, rankingsData] = await Promise.all([
      adminApi.getAllParticipants(seasonId ?? undefined),
      inbodyApi.getAll(seasonId ?? undefined),
      rankingsApi.getAll(seasonId ?? undefined),
    ]);

    applyParticipants(participantsData);
    setInbodyRows(inbodyData);
    setRankings(rankingsData);
  };

  const refreshData = async (preferredSeasonId?: string | null) => {
    const [challengeStatusData, seasonsData] = await Promise.all([
      adminApi.getChallengeStatus(),
      adminApi.getChallengeSeasons(),
    ]);

    setChallengeStatus(challengeStatusData);
    setSeasons(seasonsData);

    const availableIds = new Set(seasonsData.map((season) => season.id));
    const fallbackSeasonId =
      challengeStatusData.seasonId ?? seasonsData.find((season) => season.isActive)?.id ?? null;
    const preferred = preferredSeasonId ?? selectedSeasonId;
    const effectiveSeasonId = preferred && availableIds.has(preferred) ? preferred : fallbackSeasonId;

    setSelectedSeasonId(effectiveSeasonId);
    await loadSeasonScopedData(effectiveSeasonId);
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        await adminAuthApi.validateToken();
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;

        if (status === 401 || status === 403) {
          clearAdminSession();
          setMessageStatus('error');
          setMessage('인증에 실패했습니다. 다시 로그인해 주세요.');
          router.push('/admin/login');
          return;
        }

        console.error('토큰 검증에 실패했습니다:', error);
        setMessageStatus('error');
        setMessage('인증 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      try {
        await refreshData();
      } catch (error) {
        console.error('대시보드 데이터 조회에 실패했습니다:', error);
        setMessageStatus('error');
        setMessage('대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [router]);

  const inbodyMap = useMemo(
    () => new Map(inbodyRows.map((inbody) => [inbody.participantId, inbody])),
    [inbodyRows]
  );

  const gainRankById = useMemo(() => getRankMap(rankings.gainKing), [rankings.gainKing]);
  const lossRankById = useMemo(() => getRankMap(rankings.lossKing), [rankings.lossKing]);
  const communicationRankById = useMemo(
    () => getRankMap(rankings.communicationKing),
    [rankings.communicationKing]
  );
  const inspirationRankById = useMemo(
    () => getRankMap(rankings.inspirationKing),
    [rankings.inspirationKing]
  );

  const selectedSeasonName =
    seasons.find((season) => season.id === selectedSeasonId)?.name ?? challengeStatus?.seasonName ?? '-';

  const rows = useMemo<ParticipantTableRow[]>(() => {
    return participants.map((participant) => {
      const inbody = inbodyMap.get(participant.id) ?? null;
      const muscleGain = inbody
        ? Number(inbody.afterSkeletalMuscleMass) - Number(inbody.beforeSkeletalMuscleMass)
        : 0;
      const fatLoss = inbody
        ? Number(inbody.beforeBodyFatMass) - Number(inbody.afterBodyFatMass)
        : 0;

      return {
        participant,
        inbody,
        muscleGain,
        fatLoss,
        gainRank: gainRankById.get(participant.id) ?? null,
        lossRank: lossRankById.get(participant.id) ?? null,
        score: (participant.communicationScore || 0) + (participant.inspirationScore || 0),
      };
    });
  }, [participants, inbodyMap, gainRankById, lossRankById]);

  const filteredAndSortedRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const participantLabel = formatParticipantLabel(
        row.participant.name,
        row.participant.sponsorName
      ).toLowerCase();

      if (searchTerm && !participantLabel.includes(searchTerm)) {
        return false;
      }

      if (muscleFilter === 'gain' && row.muscleGain <= 0) {
        return false;
      }
      if (muscleFilter === 'no-gain' && row.muscleGain > 0) {
        return false;
      }

      if (fatFilter === 'loss' && row.fatLoss <= 0) {
        return false;
      }
      if (fatFilter === 'no-loss' && row.fatLoss > 0) {
        return false;
      }

      if (rankFilter === 'top5-any') {
        const isTop5 =
          (row.gainRank !== null && row.gainRank <= 5) ||
          (row.lossRank !== null && row.lossRank <= 5) ||
          ((communicationRankById.get(row.participant.id) ?? 999) <= 5) ||
          ((inspirationRankById.get(row.participant.id) ?? 999) <= 5);

        if (!isTop5) {
          return false;
        }
      }

      if (rankFilter === 'gain-ranked' && row.gainRank === null) {
        return false;
      }

      if (rankFilter === 'loss-ranked' && row.lossRank === null) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      let result = 0;

      if (sortKey === 'name') {
        result = a.participant.name.localeCompare(b.participant.name);
      } else if (sortKey === 'muscleGain') {
        result = a.muscleGain - b.muscleGain;
      } else if (sortKey === 'fatLoss') {
        result = a.fatLoss - b.fatLoss;
      } else if (sortKey === 'score') {
        result = a.score - b.score;
      } else if (sortKey === 'communicationScore') {
        result = a.participant.communicationScore - b.participant.communicationScore;
      } else if (sortKey === 'inspirationScore') {
        result = a.participant.inspirationScore - b.participant.inspirationScore;
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return filtered;
  }, [
    rows,
    search,
    muscleFilter,
    fatFilter,
    rankFilter,
    sortKey,
    sortDirection,
    communicationRankById,
    inspirationRankById,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, muscleFilter, fatFilter, rankFilter, sortKey, sortDirection, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'name' ? 'asc' : 'desc');
  };

  const handleScoreInputChange = (
    participantId: string,
    field: 'communicationScore' | 'inspirationScore',
    value: string
  ) => {
    setEditScores((prev) => ({
      ...prev,
      [participantId]: {
        communicationScore: prev[participantId]?.communicationScore ?? 0,
        inspirationScore: prev[participantId]?.inspirationScore ?? 0,
        [field]: Math.max(0, Math.min(100, asNumber(value))),
      },
    }));
  };

  const handleToggleChallenge = async (isOpen: boolean) => {
    try {
      setSeasonUpdating(true);
      const status = await adminApi.setChallengeStatus(isOpen);
      setChallengeStatus(status);
      setMessageStatus('success');
      setMessage(isOpen ? '챌린지를 Open 했습니다.' : '챌린지를 Close 했습니다.');
      await refreshData();
    } catch (error) {
      console.error('챌린지 상태 변경 실패:', error);
      setMessageStatus('error');
      setMessage('챌린지 상태 변경에 실패했습니다.');
    } finally {
      setSeasonUpdating(false);
    }
  };

  const handleCreateSeason = async () => {
    const name = seasonNameInput.trim();
    if (!name) {
      return;
    }

    try {
      setSeasonUpdating(true);
      await adminApi.createChallengeSeason(name);
      setSeasonNameInput('');
      setMessageStatus('success');
      setMessage('새 기수를 생성했습니다.');
      await refreshData();
    } catch (error) {
      console.error('기수 생성 실패:', error);
      setMessageStatus('error');
      setMessage('기수 생성에 실패했습니다.');
    } finally {
      setSeasonUpdating(false);
    }
  };

  const handleActivateSeason = async (seasonId: string) => {
    try {
      setSeasonUpdating(true);
      await adminApi.activateChallengeSeason(seasonId);
      setSelectedSeasonId(seasonId);
      setMessageStatus('success');
      setMessage('활성 기수를 변경했습니다.');
      await refreshData(seasonId);
    } catch (error) {
      console.error('기수 활성화 실패:', error);
      setMessageStatus('error');
      setMessage('기수 활성화에 실패했습니다.');
    } finally {
      setSeasonUpdating(false);
    }
  };

  const handleSelectSeason = async (seasonId: string) => {
    try {
      setSeasonUpdating(true);
      setSelectedSeasonId(seasonId);
      await loadSeasonScopedData(seasonId);
    } catch (error) {
      console.error('기수 데이터 조회 실패:', error);
      setMessageStatus('error');
      setMessage('기수 데이터 조회에 실패했습니다.');
    } finally {
      setSeasonUpdating(false);
    }
  };

  const handleRenameSeason = async (seasonId: string, currentName: string) => {
    const nextName = window.prompt('새 기수명을 입력하세요.', currentName)?.trim();
    if (!nextName || nextName === currentName) {
      return;
    }

    try {
      setSeasonUpdating(true);
      await adminApi.updateChallengeSeason(seasonId, nextName);
      setMessageStatus('success');
      setMessage('기수명을 수정했습니다.');
      await refreshData();
    } catch (error) {
      console.error('기수명 수정 실패:', error);
      setMessageStatus('error');
      setMessage('기수명 수정에 실패했습니다.');
    } finally {
      setSeasonUpdating(false);
    }
  };

  const handleUpdateScores = async (participantId: string) => {
    const scores = editScores[participantId];

    if (!scores) {
      return;
    }

    try {
      setSavingParticipantId(participantId);
      setMessage('');
      setMessageStatus(null);
      await adminApi.updateScores(participantId, scores);
      await refreshData();
      setMessageStatus('success');
      setMessage('점수가 저장되었습니다.');
    } catch (error) {
      console.error('점수 저장에 실패했습니다:', error);
      setMessageStatus('error');
      setMessage('점수 저장에 실패했습니다.');
    } finally {
      setSavingParticipantId(null);
    }
  };

  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    const confirmed = window.confirm(`${participantName} 참가자를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingParticipantId(participantId);
      setMessage('');
      setMessageStatus(null);
      await adminApi.deleteParticipant(participantId);
      await refreshData();
      setMessageStatus('success');
      setMessage('참가자를 삭제했습니다.');
    } catch (error) {
      console.error('참가자 삭제에 실패했습니다:', error);
      setMessageStatus('error');
      setMessage('참가자 삭제에 실패했습니다.');
    } finally {
      setDeletingParticipantId(null);
    }
  };

  const handleRecalculateRankings = async () => {
    try {
      setRecalculating(true);
      setMessage('');
      setMessageStatus(null);
      await adminApi.recalculateRankings();
      await refreshData();
      setMessageStatus('success');
      setMessage('순위가 다시 계산되었습니다.');
    } catch (error) {
      console.error('순위 재계산에 실패했습니다:', error);
      setMessageStatus('error');
      setMessage('순위 재계산에 실패했습니다.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } catch (error) {
      console.error('로그아웃 처리 중 오류가 발생했습니다:', error);
    } finally {
      clearAdminSession();
      router.push('/admin/login');
    }
  };

  const handleTemplateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setTemplateFile(selected);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setMessage('');
      setMessageStatus(null);

      const exportSeasonName = selectedSeasonName === '-' ? '전체' : selectedSeasonName;

      await exportParticipantsExcel(
        filteredAndSortedRows.map((row, index) => ({
          no: index + 1,
          name: row.participant.name,
          sponsorName: row.participant.sponsorName ?? '-',
          email: row.participant.email ?? row.participant.phone ?? '-',
          teamName: row.participant.teamName ?? '-',
          beforeWeight: row.inbody ? Number(row.inbody.beforeWeight) : null,
          afterWeight: row.inbody ? Number(row.inbody.afterWeight) : null,
          muscleGain: Number(formatNumber(row.muscleGain)),
          fatLoss: Number(formatNumber(row.fatLoss)),
          communicationScore: row.participant.communicationScore || 0,
          inspirationScore: row.participant.inspirationScore || 0,
          totalScore: row.score,
          submittedAt: row.inbody?.submittedAt ? formatDate(row.inbody.submittedAt) : '-',
        })),
        {
          templateFile: templateFile ?? undefined,
          fileName: `챌린저_${exportSeasonName}_${new Date().toISOString().slice(0, 10)}.xlsx`,
          seasonName: exportSeasonName,
          rankings,
        }
      );

      setMessageStatus('success');
      setMessage(`${exportSeasonName} 기준 엑셀 다운로드를 시작했습니다.`);
    } catch (error) {
      console.error('엑셀 다운로드에 실패했습니다:', error);
      setMessageStatus('error');
      setMessage(error instanceof Error ? error.message : '엑셀 다운로드에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-slate-600">
            참가자 점수와 순위 데이터를 한 곳에서 관리하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span>조회/엑셀 기준 기수</span>
            <select
              value={selectedSeasonId ?? ''}
              onChange={(e) => void handleSelectSeason(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              disabled={seasonUpdating || seasons.length === 0}
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}{season.isActive ? ' (활성)' : ''}
                </option>
              ))}
            </select>
          </div>
          <input
            ref={templateInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleTemplateFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => templateInputRef.current?.click()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            템플릿 선택
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {exporting ? '엑셀 생성 중...' : '엑셀 다운로드'}
          </button>
          <button
            type="button"
            onClick={handleRecalculateRankings}
            disabled={recalculating}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
          >
            {recalculating ? '순위 재계산 중...' : '순위 재계산'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            로그아웃
          </button>
        </div>
        <p className="text-xs text-slate-500 md:text-right">
          템플릿: {templateFile?.name ?? '기본 템플릿(/templates/챌린저_참가자.xlsx)'}
        </p>
      </div>

      {message && (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            messageStatus === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">기수 운영</h2>
            <p className="text-sm text-slate-600 mt-1">
              현재 기수: {challengeStatus?.seasonName ?? '미설정'} / 상태:{' '}
              {challengeStatus?.isOpen ? 'Open' : 'Close'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              하단 순위/참가자/엑셀은 선택한 기수 기준으로 표시됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleChallenge(true)}
              disabled={seasonUpdating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => handleToggleChallenge(false)}
              disabled={seasonUpdating}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row">
          <input
            type="text"
            value={seasonNameInput}
            onChange={(e) => setSeasonNameInput(e.target.value)}
            placeholder="예: 4기"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-56"
          />
          <button
            type="button"
            onClick={handleCreateSeason}
            disabled={seasonUpdating}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            기수 생성
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="px-3 py-2 font-semibold">기수명</th>
                <th className="px-3 py-2 font-semibold">활성</th>
                <th className="px-3 py-2 font-semibold">상태</th>
                <th className="px-3 py-2 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr
                  key={season.id}
                  className={`border-b border-slate-100 ${
                    selectedSeasonId === season.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-slate-800">{season.name}</td>
                  <td className="px-3 py-2">{season.isActive ? '활성' : '-'}</td>
                  <td className="px-3 py-2">{season.isOpen ? 'Open' : 'Close'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRenameSeason(season.id, season.name)}
                      disabled={seasonUpdating}
                      className="mr-2 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      이름수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActivateSeason(season.id)}
                      disabled={seasonUpdating || season.isActive}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      활성화
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSeason(season.id)}
                      disabled={seasonUpdating}
                      className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
              {seasons.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    등록된 기수가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">상위 10명 순위 ({selectedSeasonName})</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: '증량왕', entries: rankings.gainKing },
            { title: '감량왕', entries: rankings.lossKing },
            { title: '소통왕', entries: rankings.communicationKing },
            { title: '감동왕', entries: rankings.inspirationKing },
          ].map((category) => (
            <article
              key={category.title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {category.title}
              </h3>
              <div className="space-y-2">
                {category.entries.slice(0, CANDIDATE_LIMIT).map((entry) => (
                  <div
                    key={`${category.title}-${entry.participant.id}`}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">
                        #{entry.rank} {formatParticipantLabel(entry.participant.name, entry.participant.sponsorName)}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span>근육 +{formatNumber(entry.metrics.muscleGain)}kg</span>
                        <span>체지방 -{formatNumber(entry.metrics.fatLoss)}kg</span>
                    </div>
                  </div>
                ))}
                {category.entries.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">데이터가 없습니다</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-slate-900">참가자 ({selectedSeasonName})</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="참가자 이름으로 검색"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

            <select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value as 'all' | 'gain' | 'no-gain')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
                <option value="all">근육 증가: 전체</option>
                <option value="gain">근육 증가 &gt; 0</option>
                <option value="no-gain">근육 증가 &lt;= 0</option>
            </select>

            <select
              value={fatFilter}
              onChange={(e) => setFatFilter(e.target.value as 'all' | 'loss' | 'no-loss')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
                <option value="all">체지방 감소: 전체</option>
                <option value="loss">체지방 감소 &gt; 0</option>
                <option value="no-loss">체지방 감소 &lt;= 0</option>
            </select>

            <select
              value={rankFilter}
              onChange={(e) =>
                setRankFilter(
                  e.target.value as 'all' | 'top5-any' | 'gain-ranked' | 'loss-ranked'
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
                <option value="all">순위: 전체</option>
                 <option value="top5-any">순위: 전체 상위 5명</option>
                 <option value="gain-ranked">순위: 증량왕</option>
                <option value="loss-ranked">순위: 감량왕</option>
            </select>

            <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm md:justify-start md:gap-2">
              <span className="text-slate-600">항목 수</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number])}
                className="bg-transparent"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700">
                <th className="px-3 py-3 font-semibold">
                    <button type="button" onClick={() => handleSortClick('name')}>
                      참가자명
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">스폰서명</th>
                <th className="px-3 py-3 font-semibold">측정 전</th>
                <th className="px-3 py-3 font-semibold">측정 후</th>
                <th className="px-3 py-3 font-semibold">
                  <button type="button" onClick={() => handleSortClick('muscleGain')}>
                    근육 변화
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">
                  <button type="button" onClick={() => handleSortClick('fatLoss')}>
                    체지방 변화
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">증량왕 순위</th>
                <th className="px-3 py-3 font-semibold">감량왕 순위</th>
                <th className="px-3 py-3 font-semibold">
                  <button type="button" onClick={() => handleSortClick('communicationScore')}>
                    소통점수
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">
                  <button type="button" onClick={() => handleSortClick('inspirationScore')}>
                    동기부여점수
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">
                  <button type="button" onClick={() => handleSortClick('score')}>
                    총점
                  </button>
                </th>
                <th className="px-3 py-3 font-semibold">업로드 일시</th>
                <th className="px-3 py-3 font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => {
                const scoreInput = editScores[row.participant.id] ?? {
                  communicationScore: row.participant.communicationScore || 0,
                  inspirationScore: row.participant.inspirationScore || 0,
                };

                return (
                  <tr key={row.participant.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      <Link
                        href={`/admin/participants/${row.participant.id}`}
                        className="text-primary-700 hover:underline"
                      >
                        {row.participant.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.participant.sponsorName || '-'}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.inbody && row.inbody.beforeWeight !== null
                        ? `${formatNumber(row.inbody.beforeWeight)}kg`
                        : '-'}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.inbody && row.inbody.afterWeight !== null
                        ? `${formatNumber(row.inbody.afterWeight)}kg`
                        : '-'}
                    </td>
                    <td className="px-3 py-3 text-emerald-700">
                      {formatSignedMetric(row.muscleGain)}
                    </td>
                    <td className="px-3 py-3 text-rose-700">
                      {formatSignedMetric(-row.fatLoss)}
                    </td>
                    <td className="px-3 py-3">{renderRank(row.gainRank)}</td>
                    <td className="px-3 py-3">{renderRank(row.lossRank)}</td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={scoreInput.communicationScore}
                        onChange={(e) =>
                          handleScoreInputChange(
                            row.participant.id,
                            'communicationScore',
                            e.target.value
                          )
                        }
                        className="w-20 rounded-md border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={scoreInput.inspirationScore}
                        onChange={(e) =>
                          handleScoreInputChange(
                            row.participant.id,
                            'inspirationScore',
                            e.target.value
                          )
                        }
                        className="w-20 rounded-md border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(row.score)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.inbody?.submittedAt ? formatDate(row.inbody.submittedAt) : '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateScores(row.participant.id)}
                          disabled={savingParticipantId === row.participant.id || deletingParticipantId === row.participant.id}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          {savingParticipantId === row.participant.id ? '저장 중...' : '저장'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParticipant(row.participant.id, row.participant.name)}
                          disabled={savingParticipantId === row.participant.id || deletingParticipantId === row.participant.id}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingParticipantId === row.participant.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedRows.length === 0 && (
                <tr>
                    <td colSpan={13} className="px-3 py-12 text-center text-slate-500">
                      현재 필터 조건에 맞는 참가자가 없습니다.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            총 {filteredAndSortedRows.length}명 중 {paginatedRows.length}명 표시
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              이전
            </button>
            <span className="min-w-20 text-center">
                {page} / {totalPages} 페이지
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
