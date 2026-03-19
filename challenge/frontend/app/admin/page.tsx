'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { ParticipantWithRecords } from '@/types';

export default function AdminPage() {
  const [participants, setParticipants] = useState<ParticipantWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParticipantWithRecords | null>(null);
  const [scores, setScores] = useState({ communicationScore: 0, inspirationScore: 0 });
  const [sponsorName, setSponsorName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminApi.getAllParticipants()
      .then(setParticipants)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (p: ParticipantWithRecords) => {
    setSelected(p);
    setScores({
      communicationScore: p.score?.communicationScore || 0,
      inspirationScore: p.score?.inspirationScore || 0,
    });
    setSponsorName(p.sponsorName || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await adminApi.updateScores(selected.id, scores);
      await adminApi.updateSponsor(selected.id, sponsorName.trim());
      setMessage('Scores updated successfully!');
      const refreshed = await adminApi.getAllParticipants();
      setParticipants(refreshed);
      setSelected(refreshed.find((participant) => participant.id === selected.id) || null);
    } catch {
      setMessage('Failed to update scores.');
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div></div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">Admin Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Participants</h2>
          <div className="space-y-2">
            {participants.map((p) => (
              <button key={p.id} onClick={() => handleSelect(p)} className={`w-full text-left p-4 rounded-lg transition-colors ${selected?.id === p.id ? 'bg-primary-100 border-2 border-primary-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-500">{p.phone}</p>
                <p className="text-sm text-gray-500">Sponsor: {p.sponsorName || '-'}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Update Participant</h2>
          {selected ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-md">
              <p className="font-medium mb-2">Selected: {selected.name}</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name</label>
                <input type="text" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Communication Score</label>
                <input type="number" min="0" max="100" value={scores.communicationScore} onChange={(e) => setScores({...scores, communicationScore: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspiration Score</label>
                <input type="number" min="0" max="100" value={scores.inspirationScore} onChange={(e) => setScores({...scores, inspirationScore: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700">Update Participant</button>
              {message && <p className={`text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            </form>
          ) : (
            <div className="bg-gray-50 p-6 rounded-xl text-center text-gray-500">Select a participant to update sponsor and scores</div>
          )}
        </div>
      </div>
    </div>
  );
}
