'use client';

import { rankingsApi } from '@/lib/api';
import { RankingEntry } from '@/types';
import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

type TabType = 'gain-king' | 'loss-king' | 'communication-king' | 'inspiration-king';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'gain-king', label: 'Gain King', icon: '💪' },
  { id: 'loss-king', label: 'Loss King', icon: '🔥' },
  { id: 'communication-king', label: 'Communication King', icon: '💬' },
  { id: 'inspiration-king', label: 'Inspiration King', icon: '⭐' },
];

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('gain-king');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = {
      'gain-king': rankingsApi.getGainKing,
      'loss-king': rankingsApi.getLossKing,
      'communication-king': rankingsApi.getCommunicationKing,
      'inspiration-king': rankingsApi.getInspirationKing,
    };
    fetcher[activeTab]().then(setRankings).finally(() => setLoading(false));
  }, [activeTab]);

  const isBodyMetrics = activeTab === 'gain-king' || activeTab === 'loss-king';

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Rankings</h1>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12"><p className="text-gray-500">No rankings available yet</p></div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {rankings.map((entry) => (
            <div key={entry.participant.id} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-md">
              <div className="flex items-center gap-4">
                <span className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${
                  entry.rank === 1 ? 'bg-yellow-400 text-white' :
                  entry.rank === 2 ? 'bg-gray-300 text-white' :
                  entry.rank === 3 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-600'
                }`}>{entry.rank}</span>
                <div>
                  <p className="font-semibold text-lg">{entry.participant.name}</p>
                </div>
              </div>
              <div className="text-right">
                {isBodyMetrics ? (
                  <>
                    <p className="font-medium">Muscle: <span className="text-green-600">+{formatNumber(entry.metrics.muscleGain)}kg</span></p>
                    <p className="text-sm text-gray-500">Fat: <span className="text-red-600">-{formatNumber(entry.metrics.fatLoss)}kg</span></p>
                  </>
                ) : (
                  <p className="font-medium text-lg">Score: {entry.metrics.totalScore}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
