'use client';

import { rankingsApi } from '@/lib/api';
import { RankingEntry, Rankings } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { formatNumber } from '@/lib/utils';

type CategoryKey = 'gainKing' | 'lossKing' | 'communicationKing' | 'inspirationKing';
type SortKey = 'rank' | 'name' | 'score' | 'muscleGain' | 'fatLoss';
type SortDirection = 'asc' | 'desc';

const CANDIDATE_LIMIT = 10;

const categories: {
  key: CategoryKey;
  label: string;
  icon: string;
  isBodyMetrics: boolean;
  priorityText: string;
}[] = [
  {
    key: 'gainKing',
    label: '증량왕',
    icon: '💪',
    isBodyMetrics: true,
    priorityText: '우선순위: 근육 증가 ↑, 동점 시 체지방 감소 ↑',
  },
  {
    key: 'lossKing',
    label: '감량왕',
    icon: '🔥',
    isBodyMetrics: true,
    priorityText: '우선순위: 체지방 감소 ↑, 동점 시 근육 증가 ↑',
  },
  {
    key: 'communicationKing',
    label: '소통왕',
    icon: '💬',
    isBodyMetrics: false,
    priorityText: '우선순위: 소통 점수 ↑',
  },
  {
    key: 'inspirationKing',
    label: '동기부여왕',
    icon: '⭐',
    isBodyMetrics: false,
    priorityText: '우선순위: 동기부여 점수 ↑',
  },
];

const emptyRankings: Rankings = {
  gainKing: [],
  lossKing: [],
  communicationKing: [],
  inspirationKing: [],
};

export default function RankingsPage() {
  const [rankings, setRankings] = useState<Rankings>(emptyRankings);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('gainKing');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      try {
        const data = await rankingsApi.getAll();
        setRankings(data);
      } catch (error) {
        console.error('랭킹 조회에 실패했습니다:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRankings();
  }, []);

  const selectedCategoryMeta = categories.find((category) => category.key === selectedCategory);
  const selectedEntries = rankings[selectedCategory];

  const filteredEntries = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const filtered = selectedEntries.filter((entry) => {
      if (!searchTerm) {
        return true;
      }

      return (
        entry.participant.name.toLowerCase().includes(searchTerm) ||
        (entry.participant.teamName ?? '').toLowerCase().includes(searchTerm)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === 'rank') {
        return sortDirection === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      }

      if (sortKey === 'name') {
        const value = a.participant.name.localeCompare(b.participant.name, 'ko-KR');
        return sortDirection === 'asc' ? value : -value;
      }

      if (sortKey === 'score') {
        const value = a.metrics.totalScore - b.metrics.totalScore;
        return sortDirection === 'asc' ? value : -value;
      }

      if (sortKey === 'muscleGain') {
        const value = a.metrics.muscleGain - b.metrics.muscleGain;
        return sortDirection === 'asc' ? value : -value;
      }

      const value = a.metrics.fatLoss - b.metrics.fatLoss;
      return sortDirection === 'asc' ? value : -value;
    });
  }, [search, selectedEntries, sortDirection, sortKey]);

  const topCandidatesByCategory = categories.map((category) => ({
    ...category,
    entries: rankings[category.key].slice(0, CANDIDATE_LIMIT),
  }));

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
        순위
      </h1>

      <section className="mb-12">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topCandidatesByCategory.map((category) => (
            <article
              key={category.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </h2>
                <p className="mt-1 text-xs text-gray-500">{category.priorityText}</p>
              </div>
              <div className="space-y-2">
                {category.entries.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">데이터가 없습니다</p>
                ) : (
                  category.entries.map((entry) => (
                    <div
                      key={`${category.key}-${entry.participant.id}`}
                      className="rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          #{entry.rank} {entry.participant.name}
                        </p>
                      </div>
                      {category.isBodyMetrics && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                          <span>근육 +{formatNumber(entry.metrics.muscleGain)}kg</span>
                          <span>체지방 -{formatNumber(entry.metrics.fatLoss)}kg</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">전체 리스트</h2>
          <p className="mt-1 text-sm text-gray-600">
            카테고리/이름 검색/정렬 기준으로 원하는 순위를 확인하세요.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setSelectedCategory(category.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="이름 또는 팀명 검색"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="rank">정렬: 순위</option>
            <option value="name">정렬: 이름</option>
            <option value="score">정렬: 점수</option>
            <option value="muscleGain">정렬: 근육 변화</option>
            <option value="fatLoss">정렬: 체지방 변화</option>
          </select>

          <select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as SortDirection)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="asc">오름차순</option>
            <option value="desc">내림차순</option>
          </select>

          <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600">
            표시 인원: {filteredEntries.length}명
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">조건에 맞는 순위 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry: RankingEntry) => (
              <div
                key={`${selectedCategory}-${entry.participant.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                      entry.rank === 1
                        ? 'bg-yellow-400 text-white'
                        : entry.rank === 2
                        ? 'bg-gray-300 text-white'
                        : entry.rank === 3
                        ? 'bg-orange-300 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{entry.participant.name}</p>
                    {entry.participant.teamName && (
                      <p className="text-xs text-gray-500">{entry.participant.teamName}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {selectedCategoryMeta?.isBodyMetrics ? (
                    <div className="text-xs text-gray-500">
                      <p>근육 +{formatNumber(entry.metrics.muscleGain)}kg</p>
                      <p>체지방 -{formatNumber(entry.metrics.fatLoss)}kg</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      카테고리 점수 기반 순위
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
