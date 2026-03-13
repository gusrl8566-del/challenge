'use client';

import { useState } from 'react';
import { uploadsApi, inbodyApi, authApi } from '@/lib/api';

export default function UploadPage() {
  const [step, setStep] = useState<'login' | 'upload'>('login');
  const [participantId, setParticipantId] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforeData, setBeforeData] = useState({ weight: 0, skeletalMuscleMass: 0, bodyFatMass: 0 });
  const [afterData, setAfterData] = useState({ weight: 0, skeletalMuscleMass: 0, bodyFatMass: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const participant = await authApi.login({
        phone: formData.get('phone') as string,
        password: formData.get('password') as string,
      });
      setParticipantId(participant.id);
      setStep('upload');
    } catch {
      setMessage('Login failed. Please check your phone and password.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let beforeUrl = '', afterUrl = '';
      if (beforeFile) beforeUrl = (await uploadsApi.uploadImage(beforeFile)).url;
      if (afterFile) afterUrl = (await uploadsApi.uploadImage(afterFile)).url;

      await inbodyApi.submit(participantId, { phase: 'before', ...beforeData, imageUrl: beforeUrl });
      await inbodyApi.submit(participantId, { phase: 'after', ...afterData, imageUrl: afterUrl });

      setMessage('InBody data submitted successfully!');
    } catch {
      setMessage('Failed to submit data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'login') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-8">Login to Upload</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" name="phone" required placeholder="010-1234-5678" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" name="password" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700">Login</button>
          </form>
          {message && <p className="mt-4 text-center text-red-600">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-center mb-8">Upload Your InBody Data</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Before InBody</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">InBody Image</label>
              <input type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] || null)} className="w-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label><input type="number" step="0.1" value={beforeData.weight} onChange={(e) => setBeforeData({...beforeData, weight: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Muscle (kg)</label><input type="number" step="0.1" value={beforeData.skeletalMuscleMass} onChange={(e) => setBeforeData({...beforeData, skeletalMuscleMass: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Body Fat (kg)</label><input type="number" step="0.1" value={beforeData.bodyFatMass} onChange={(e) => setBeforeData({...beforeData, bodyFatMass: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">After InBody</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">InBody Image</label>
              <input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} className="w-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label><input type="number" step="0.1" value={afterData.weight} onChange={(e) => setAfterData({...afterData, weight: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Muscle (kg)</label><input type="number" step="0.1" value={afterData.skeletalMuscleMass} onChange={(e) => setAfterData({...afterData, skeletalMuscleMass: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Body Fat (kg)</label><input type="number" step="0.1" value={afterData.bodyFatMass} onChange={(e) => setAfterData({...afterData, bodyFatMass: +e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit'}
        </button>
        {message && <p className={`text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </form>
    </div>
  );
}
