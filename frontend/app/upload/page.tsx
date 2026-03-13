'use client';

import { useEffect, useState } from 'react';
import { uploadsApi, inbodyApi, authApi, challengeApi, healthApi } from '@/lib/api';
import { ChallengeStatus, InbodyMetrics } from '@/types';

export default function UploadPage() {
  const [step, setStep] = useState<'login' | 'upload'>('login');
  const [participantId, setParticipantId] = useState('');
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [beforeData, setBeforeData] = useState<InbodyMetrics>({
    weight: 0,
    skeletalMuscleMass: 0,
    bodyFatMass: 0,
  });
  const [afterData, setAfterData] = useState<InbodyMetrics>({
    weight: 0,
    skeletalMuscleMass: 0,
    bodyFatMass: 0,
  });
  const [loading, setLoading] = useState(false);
  const [savingImageType, setSavingImageType] = useState<'before' | 'after' | null>(null);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStatusText, setParseStatusText] = useState('');
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'success' | 'error' | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [statusWarning, setStatusWarning] = useState('');

  useEffect(() => {
    Promise.allSettled([challengeApi.getStatus(), healthApi.getDbStatus()]).then((results) => {
      const [challengeResult, dbResult] = results;

      if (challengeResult.status === 'fulfilled') {
        setChallengeStatus(challengeResult.value);
      } else {
        setChallengeStatus(null);
        setStatusWarning('챌린지 상태를 불러오지 못했습니다. 서버 상태를 확인해주세요.');
      }

      if (dbResult.status === 'fulfilled' && !dbResult.value.dbConnected) {
        setStatusWarning('DB 연결 상태가 불안정합니다. 저장/파싱이 실패할 수 있습니다.');
      } else if (dbResult.status === 'rejected') {
        setStatusWarning('DB 연결 상태를 확인할 수 없습니다. 서버 상태를 확인해주세요.');
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const participant = await authApi.quickAccess({
        name: formData.get('name') as string,
        loginId: formData.get('loginId') as string,
      });
      setParticipantId(participant.id);

      const existing = await inbodyApi.getByParticipant(participant.id);
      if (existing) {
        setBeforeImageUrl(existing.beforeImageUrl || null);
        setAfterImageUrl(existing.afterImageUrl || null);
        setBeforeData({
          weight: existing.beforeWeight || 0,
          skeletalMuscleMass: existing.beforeSkeletalMuscleMass || 0,
          bodyFatMass: existing.beforeBodyFatMass || 0,
        });
        setAfterData({
          weight: existing.afterWeight || 0,
          skeletalMuscleMass: existing.afterSkeletalMuscleMass || 0,
          bodyFatMass: existing.afterBodyFatMass || 0,
        });
      }

      setStep('upload');
    } catch {
      setMessage('참가 정보를 확인해주세요.');
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const result = await uploadsApi.uploadImage(file);
      return result.url;
    } catch {
      throw new Error('이미지 업로드에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!beforeImageUrl || !afterImageUrl) {
      setMessage('측정 전/후 이미지를 각각 업로드해주세요.');
      setMessageStatus('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageStatus(null);

    try {
      await inbodyApi.submit(participantId, {
        before: {
          ...beforeData,
          imageUrl: beforeImageUrl,
        },
        after: {
          ...afterData,
          imageUrl: afterImageUrl,
        },
      });

      setMessage('저장되었습니다.');
      setMessageStatus('success');
    } catch {
      setMessage('저장에 실패했습니다. 다시 시도해주세요.');
      setMessageStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoProcessImage = async (
    imageType: 'before' | 'after',
    imageFile: File | null,
  ) => {
    if (!imageFile) {
      setMessage(
        imageType === 'before' ? '측정 전 이미지를 선택해주세요.' : '측정 후 이미지를 선택해주세요.',
      );
      setMessageStatus('error');
      return;
    }

    try {
      setSavingImageType(imageType);
      setParseProgress(10);
      setParseStatusText('이미지 업로드 중...');
      setMessage('');
      setMessageStatus(null);

      const uploaded = await uploadsApi.uploadImage(imageFile);
      setParseProgress(45);
      setParseStatusText('이미지 저장 중...');

      await inbodyApi.updateImageUrl(participantId, {
        imageType,
        imageUrl: uploaded.url,
        filename: uploaded.filename,
      });

      if (imageType === 'before') {
        setBeforeImageUrl(uploaded.url);
      } else {
        setAfterImageUrl(uploaded.url);
      }

      setParseProgress(65);
      setParseStatusText('OCR 파싱 중...');

      try {
        const parsed = await inbodyApi.parseSingleImage(participantId, {
          imageType,
          imageUrl: uploaded.url,
        });

        const parsedMetrics = parsed.extracted;
        const hasMissingMetric =
          parsedMetrics.weight === null ||
          parsedMetrics.skeletalMuscleMass === null ||
          parsedMetrics.bodyFatMass === null;

        if (imageType === 'before') {
          setBeforeData((prev) => ({
            weight: parsedMetrics.weight ?? prev.weight,
            skeletalMuscleMass:
              parsedMetrics.skeletalMuscleMass ?? prev.skeletalMuscleMass,
            bodyFatMass: parsedMetrics.bodyFatMass ?? prev.bodyFatMass,
          }));
        } else {
          setAfterData((prev) => ({
            weight: parsedMetrics.weight ?? prev.weight,
            skeletalMuscleMass:
              parsedMetrics.skeletalMuscleMass ?? prev.skeletalMuscleMass,
            bodyFatMass: parsedMetrics.bodyFatMass ?? prev.bodyFatMass,
          }));
        }

        setParseProgress(100);
        setParseStatusText(hasMissingMetric ? '이미지 저장 완료' : 'OCR 완료');

        if (parsed.ocrMode === 'fallback' && !hasMissingMetric) {
          setMessage(
            imageType === 'before'
              ? '측정 전 OCR 파싱 완료 (정밀 재시도 적용)'
              : '측정 후 OCR 파싱 완료 (정밀 재시도 적용)',
          );
          setMessageStatus('success');
          return;
        }

        if (parsed.ocrMode === 'fast-failed') {
          setMessage('이미지 저장은 완료되었습니다. OCR이 시간 초과되어 값을 직접 입력해주세요.');
          setMessageStatus('error');
          return;
        }

        setMessage(
          hasMissingMetric
            ? '이미지 저장은 완료되었습니다. OCR 파싱이 불완전하여 값을 직접 확인/수정해주세요.'
            : imageType === 'before'
              ? '측정 전 OCR 파싱 완료'
              : '측정 후 OCR 파싱 완료',
        );
        setMessageStatus(hasMissingMetric ? 'error' : 'success');
      } catch {
        setParseProgress(100);
        setParseStatusText('이미지 저장 완료');
        setMessage('이미지 저장은 완료되었습니다. OCR 파싱에 실패하여 값을 직접 입력해주세요.');
        setMessageStatus('error');
      }
    } catch {
      setMessage('이미지 업로드 또는 OCR 파싱에 실패했습니다.');
      setMessageStatus('error');
    } finally {
      setSavingImageType(null);
      setTimeout(() => {
        setParseProgress(0);
        setParseStatusText('');
      }, 800);
    }
  };

  if (challengeStatus && !challengeStatus.isOpen) {
    return (
      <div className="container mx-auto px-4 py-12">
        {statusWarning && (
          <div className="max-w-lg mx-auto mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {statusWarning}
          </div>
        )}
        <div className="max-w-lg mx-auto rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-amber-900 mb-2">참가 대기 중</h1>
          <p className="text-amber-800">아직은 챌린지에 참가할 수 없습니다.</p>
          {challengeStatus.seasonName && (
            <p className="text-sm text-amber-700 mt-2">현재 기수: {challengeStatus.seasonName}</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {statusWarning && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {statusWarning}
            </div>
          )}
          <h1 className="text-2xl font-bold text-center mb-8">업로드 로그인</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일 또는 휴대폰번호
              </label>
              <input
                type="text"
                name="loginId"
                required
                placeholder="example@email.com 또는 01012345678"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              참여하기
            </button>
          </form>
          {message && (
            <p className="mt-4 text-center text-red-600">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
        {statusWarning && (
          <div className="max-w-2xl mx-auto mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {statusWarning}
          </div>
        )}
        <h1 className="text-2xl font-bold text-center mb-8">InBody 데이터 업로드</h1>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
           <h2 className="text-xl font-semibold mb-4">측정 전</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  InBody 이미지
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleAutoProcessImage('before', e.target.files?.[0] || null)
                }
                className="w-full"
              />
              {savingImageType === 'before' && (
                <p className="mt-2 text-xs text-blue-700">측정 전 이미지 처리 중...</p>
              )}
              {beforeImageUrl && (
                <p className="mt-2 text-xs text-emerald-700">저장 완료: {beforeImageUrl}</p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  체중 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={beforeData.weight}
                  onChange={(e) =>
                    setBeforeData({ ...beforeData, weight: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  근육량 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={beforeData.skeletalMuscleMass}
                  onChange={(e) =>
                    setBeforeData({
                      ...beforeData,
                      skeletalMuscleMass: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  체지방량 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={beforeData.bodyFatMass}
                  onChange={(e) =>
                    setBeforeData({
                      ...beforeData,
                      bodyFatMass: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
           <h2 className="text-xl font-semibold mb-4">측정 후</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  InBody 이미지
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleAutoProcessImage('after', e.target.files?.[0] || null)
                }
                className="w-full"
              />
              {savingImageType === 'after' && (
                <p className="mt-2 text-xs text-blue-700">측정 후 이미지 처리 중...</p>
              )}
              {afterImageUrl && (
                <p className="mt-2 text-xs text-emerald-700">저장 완료: {afterImageUrl}</p>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  체중 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={afterData.weight}
                  onChange={(e) =>
                    setAfterData({ ...afterData, weight: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  근육량 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={afterData.skeletalMuscleMass}
                  onChange={(e) =>
                    setAfterData({
                      ...afterData,
                      skeletalMuscleMass: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  체지방량 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={afterData.bodyFatMass}
                  onChange={(e) =>
                    setAfterData({
                      ...afterData,
                      bodyFatMass: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'OCR 파싱 중...' : '저장'}
        </button>

        {message && (
          <p
            className={`text-center ${
              messageStatus === 'error' ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </p>
        )}
      </form>

      {parseProgress > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
              <span>{parseStatusText || '처리 중...'}</span>
              <span>{parseProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-500"
                style={{ width: `${parseProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              잠시만 기다려주세요. 이미지 업로드와 OCR 파싱을 진행 중입니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
