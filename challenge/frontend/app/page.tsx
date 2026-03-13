'use client';

import { rankingsApi } from '@/lib/api';
import { RankingEntry } from '@/types';
import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

export default function Home() {
  const [rankings, setRankings] = useState<{
    gainKing: RankingEntry[];
    lossKing: RankingEntry[];
  }>({ gainKing: [], lossKing: [] });

  useEffect(() => {
    rankingsApi.getGainKing().then(d => setRankings(p => ({ ...p, gainKing: d.slice(0, 3) })));
    rankingsApi.getLossKing().then(d => setRankings(p => ({ ...p, lossKing: d.slice(0, 3) })));
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">InBody Challenge</h1>
        <p className="text-lg text-gray-600">Transform your body, become the King!</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">💪</span>
            <h2 className="text-2xl font-bold text-gray-900">Gain King</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Priority: Muscle Gain ↑, Fat Loss ↓</p>
          <div className="space-y-4">
            {rankings.gainKing.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No rankings yet</p>
            ) : (
              rankings.gainKing.map((entry) => (
                <div key={entry.participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      entry.rank === 1 ? 'bg-yellow-400 text-white' :
                      entry.rank === 2 ? 'bg-gray-300 text-white' :
                      entry.rank === 3 ? 'bg-orange-300 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{entry.rank}</span>
                    <div>
                      <p className="font-semibold">{entry.participant.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">+{formatNumber(entry.metrics.muscleGain)}kg muscle</p>
                    <p className="text-sm text-gray-500">-{formatNumber(entry.metrics.fatLoss)}kg fat</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔥</span>
            <h2 className="text-2xl font-bold text-gray-900">Loss King</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Priority: Fat Loss ↑, Muscle Gain ↓</p>
          <div className="space-y-4">
            {rankings.lossKing.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No rankings yet</p>
            ) : (
              rankings.lossKing.map((entry) => (
                <div key={entry.participant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      entry.rank === 1 ? 'bg-yellow-400 text-white' :
                      entry.rank === 2 ? 'bg-gray-300 text-white' :
                      entry.rank === 3 ? 'bg-orange-300 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{entry.rank}</span>
                    <div>
                      <p className="font-semibold">{entry.participant.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">-{formatNumber(entry.metrics.fatLoss)}kg fat</p>
                    <p className="text-sm text-gray-500">+{formatNumber(entry.metrics.muscleGain)}kg muscle</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <a href="/rankings" className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          View All Rankings
        </a>
      </div>
    </div>
  );
}
