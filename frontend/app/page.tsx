'use client';

import { rankingsApi } from '@/lib/api';
import { RankingEntry } from '@/types';
import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

const CANDIDATE_LIMIT = 10;

export default function Home() {
  const [rankings, setRankings] = useState<{
    gainKing: RankingEntry[];
    lossKing: RankingEntry[];
  }>({
    gainKing: [],
    lossKing: [],
  });

  useEffect(() => {
    async function fetchRankings() {
      try {
        const data = await rankingsApi.getAll();
        setRankings({
          gainKing: data.gainKing.slice(0, CANDIDATE_LIMIT),
          lossKing: data.lossKing.slice(0, CANDIDATE_LIMIT),
        });
      } catch (error) {
        console.error('랭킹 조회에 실패했습니다:', error);
      }
    }
    fetchRankings();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          InBody Challenge
        </h1>
        <p className="text-lg text-gray-600">
          몸을 바꾸고, 챌린지의 왕이 되어보세요!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💪</span>
            <h2 className="text-2xl font-bold text-gray-900">증량왕</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            우선순위: 근육 증가 ↑, 동점 시 체지방 감소 ↑
          </p>
          <div className="space-y-4">
            {rankings.gainKing.length === 0 ? (
                <p className="text-gray-500 text-center py-4">아직 순위 데이터가 없습니다</p>
            ) : (
              rankings.gainKing.map((entry) => (
                <div
                  key={entry.participant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                        entry.rank === 1
                          ? 'bg-yellow-400 text-white'
                          : entry.rank === 2
                          ? 'bg-gray-300 text-white'
                          : entry.rank === 3
                          ? 'bg-orange-300 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-semibold">{entry.participant.name}</p>
                      {entry.participant.teamName && (
                        <p className="text-sm text-gray-500">
                          {entry.participant.teamName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      근육 +{formatNumber(entry.metrics.muscleGain)}kg
                    </p>
                    <p className="text-sm text-gray-500">
                      체지방 -{formatNumber(entry.metrics.fatLoss)}kg
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔥</span>
            <h2 className="text-2xl font-bold text-gray-900">감량왕</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            우선순위: 체지방 감소 ↑, 동점 시 근육 증가 ↑
          </p>
          <div className="space-y-4">
            {rankings.lossKing.length === 0 ? (
                <p className="text-gray-500 text-center py-4">아직 순위 데이터가 없습니다</p>
            ) : (
              rankings.lossKing.map((entry) => (
                <div
                  key={entry.participant.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                        entry.rank === 1
                          ? 'bg-yellow-400 text-white'
                          : entry.rank === 2
                          ? 'bg-gray-300 text-white'
                          : entry.rank === 3
                          ? 'bg-orange-300 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-semibold">{entry.participant.name}</p>
                      {entry.participant.teamName && (
                        <p className="text-sm text-gray-500">
                          {entry.participant.teamName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      체지방 -{formatNumber(entry.metrics.fatLoss)}kg
                    </p>
                    <p className="text-sm text-gray-500">
                      근육 +{formatNumber(entry.metrics.muscleGain)}kg
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600 mb-4">
          전체 순위를 확인해볼까요?
        </p>
        <a
          href="/rankings"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          전체 순위 보기
        </a>
      </div>
    </div>
  );
}
