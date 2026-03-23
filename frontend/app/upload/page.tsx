'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { challengeApi, healthApi, inbodyRecordApi, uploadsApi } from '@/lib/api';
import { ChallengeStatus } from '@/types';

type FlowStep = 'upload' | 'processing' | 'confirm' | 'submitted';
type RecordType = 'start' | 'end';
type ProgressPhotoKey = 'front' | 'back' | 'side';

const progressPhotoLabels: Record<ProgressPhotoKey, string> = {
  front: '앞면',
  back: '뒷면',
  side: '옆면',
};

function toInputValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(1);
}

export default function UploadPage() {
  const [step, setStep] = useState<FlowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [weight, setWeight] = useState('');
  const [skeletalMuscleMass, setSkeletalMuscleMass] = useState('');
  const [bodyFatMass, setBodyFatMass] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('start');
  const [progressPhotos, setProgressPhotos] = useState<Record<ProgressPhotoKey, File | null>>({
    front: null,
    back: null,
    side: null,
  });
  const [progressPhotoUrls, setProgressPhotoUrls] = useState<
    Record<ProgressPhotoKey, string | null>
  >({
    front: null,
    back: null,
    side: null,
  });
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState<ProgressPhotoKey | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus | null>(null);
  const [statusWarning, setStatusWarning] = useState('');
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'success' | 'error' | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    Promise.allSettled([challengeApi.getStatus(), healthApi.getDbStatus()]).then((results) => {
      const [challengeResult, dbResult] = results;

      if (challengeResult.status === 'fulfilled') {
        setChallengeStatus(challengeResult.value);
      } else {
        setChallengeStatus(null);
        setStatusWarning('챌린지 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      if (dbResult.status === 'fulfilled' && !dbResult.value.dbConnected) {
        setStatusWarning('DB 연결 상태가 불안정합니다. 저장이 실패할 수 있습니다.');
      } else if (dbResult.status === 'rejected') {
        setStatusWarning('DB 연결 상태를 확인할 수 없습니다.');
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleStartOcr = async () => {
    if (!selectedFile) {
      setMessage('인바디 사진을 먼저 선택해주세요.');
      setMessageStatus('error');
      return;
    }

    setStep('processing');
    setMessage('');
    setMessageStatus(null);

    try {
      const uploaded = await uploadsApi.uploadImage(selectedFile);
      setImageUrl(uploaded.url);

      const extracted = await inbodyRecordApi.extractFromImage(uploaded.url);
      setWeight(toInputValue(extracted.weight));
      setSkeletalMuscleMass(toInputValue(extracted.skeletal_muscle_mass));
      setBodyFatMass(toInputValue(extracted.body_fat_mass));

      if (extracted.member_id) {
        setPhoneNumber(extracted.member_id.replace(/\D/g, ''));
      }

      setStep('confirm');
      setMessage('OCR 파싱이 완료되었습니다. 값을 확인하고 나머지 사진을 업로드한 뒤 제출해주세요.');
      setMessageStatus('success');
    } catch {
      setStep('upload');
      setMessage('OCR 처리에 실패했습니다. 인바디 사진을 다시 올려주세요.');
      setMessageStatus('error');
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      setMessage('사진이 선택되었습니다. 아래 버튼으로 업로드를 진행해주세요.');
      setMessageStatus('success');
      return;
    }

    setMessage('');
    setMessageStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const parsedWeight = Number(weight);
    const parsedSkeletalMuscleMass = Number(skeletalMuscleMass);
    const parsedBodyFatMass = Number(bodyFatMass);

    if (!name.trim()) {
      setMessage('이름을 입력해주세요.');
      setMessageStatus('error');
      return;
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    if (!normalizedPhone) {
      setMessage('휴대폰번호를 입력해주세요.');
      setMessageStatus('error');
      return;
    }

    if (!sponsorName.trim()) {
      setMessage('스폰서명을 입력해주세요.');
      setMessageStatus('error');
      return;
    }

    if (
      !Number.isFinite(parsedWeight) ||
      !Number.isFinite(parsedSkeletalMuscleMass) ||
      !Number.isFinite(parsedBodyFatMass)
    ) {
      setMessage('체중, 골격근량, 체지방량을 정확히 입력해주세요.');
      setMessageStatus('error');
      return;
    }

    if (!progressPhotoUrls.front || !progressPhotoUrls.back || !progressPhotoUrls.side) {
      setMessage('앞면, 뒷면, 옆면 사진을 모두 업로드해주세요.');
      setMessageStatus('error');
      return;
    }

    try {
      if (!imageUrl) {
        setMessage('인바디 OCR 이미지가 없습니다. 처음 단계부터 다시 진행해주세요.');
        setMessageStatus('error');
        return;
      }

      await inbodyRecordApi.saveRecord({
        phone_number: normalizedPhone,
        name: name.trim(),
        sponsor_name: sponsorName.trim(),
        weight: parsedWeight,
        skeletal_muscle_mass: parsedSkeletalMuscleMass,
        body_fat_mass: parsedBodyFatMass,
        record_type: recordType,
        image_url: imageUrl,
        front_image_url: progressPhotoUrls.front,
        back_image_url: progressPhotoUrls.back,
        side_image_url: progressPhotoUrls.side,
        source: 'ocr',
      });

      setStep('submitted');
      setMessage('제출이 완료되었습니다.');
      setMessageStatus('success');
    } catch {
      setMessage('저장에 실패했습니다. 다시 시도해주세요.');
      setMessageStatus('error');
    }
  };

  const resetForNewUpload = () => {
    setStep('upload');
    setSelectedFile(null);
    setImageUrl('');
    setPhoneNumber('');
    setName('');
    setSponsorName('');
    setWeight('');
    setSkeletalMuscleMass('');
    setBodyFatMass('');
    setRecordType('start');
    setProgressPhotos({
      front: null,
      back: null,
      side: null,
    });
    setProgressPhotoUrls({
      front: null,
      back: null,
      side: null,
    });
    setUploadingPhotoKey(null);
    setMessage('');
    setMessageStatus(null);
  };

  const handleProgressPhotoSelect = async (photoKey: ProgressPhotoKey, file: File | null) => {
    setProgressPhotos((prev) => ({
      ...prev,
      [photoKey]: file,
    }));

    if (!file) {
      setProgressPhotoUrls((prev) => ({
        ...prev,
        [photoKey]: null,
      }));
      return;
    }

    try {
      setUploadingPhotoKey(photoKey);
      const uploaded = await uploadsApi.uploadImage(file);
      setProgressPhotoUrls((prev) => ({
        ...prev,
        [photoKey]: uploaded.url,
      }));
    } catch {
      setProgressPhotoUrls((prev) => ({
        ...prev,
        [photoKey]: null,
      }));
      setMessage(`${progressPhotoLabels[photoKey]} 사진 업로드에 실패했습니다. 다시 선택해주세요.`);
      setMessageStatus('error');
    } finally {
      setUploadingPhotoKey((prev) => (prev === photoKey ? null : prev));
    }
  };

  if (challengeStatus && !challengeStatus.isOpen) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        {statusWarning && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-lg text-amber-900">
            {statusWarning}
          </p>
        )}
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
          <h1 className="text-3xl font-bold text-amber-900">참가 대기 중</h1>
          <p className="mt-3 text-xl text-amber-900">현재는 업로드 기간이 아닙니다.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-4xl font-bold tracking-tight text-slate-900">인바디 업로드</h1>

      {challengeStatus?.seasonName && (
        <p className="mb-4 text-center text-lg font-medium text-slate-700">
          현재 기수: <span className="font-semibold text-slate-900">{challengeStatus.seasonName}</span>
        </p>
      )}

      {statusWarning && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-lg text-amber-900">
          {statusWarning}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 'upload' && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-semibold text-slate-900">촬영 가이드 (OCR 정확도 향상)</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-800">정상적인 케이스</p>
                  <img
                    src="/examples/inbody_good.jpg"
                    alt="정상적인 인바디 업로드 예시"
                    className="mt-2 h-72 w-full rounded-lg border border-emerald-200 bg-white object-contain"
                  />
                  <p className="mt-2 text-sm text-emerald-800">세로 촬영 + 여백 최소 + 숫자 선명</p>
                </article>

                <article className="rounded-xl border border-rose-300 bg-rose-50 p-3">
                  <p className="text-sm font-semibold text-rose-800">비정상적인 케이스</p>
                  <img
                    src="/examples/inbody_bad.jpg"
                    alt="비정상적인 인바디 업로드 예시"
                    className="mt-2 h-72 w-full rounded-lg border border-rose-200 bg-white object-contain"
                  />
                  <p className="mt-2 text-sm text-rose-800">가로 촬영/원거리/흐림/잘림은 인식 실패 가능</p>
                </article>
              </div>
            </section>

            <p className="text-xl text-slate-700">1) 인바디 사진을 선택해주세요.</p>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />
            <input
              ref={albumInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-[72px] items-center justify-center gap-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-2xl font-semibold text-slate-900 hover:bg-slate-100"
              >
                <span aria-hidden="true">📷</span>
                <span>사진 찍기</span>
              </button>
              <button
                type="button"
                onClick={() => albumInputRef.current?.click()}
                className="flex h-[72px] items-center justify-center gap-3 rounded-xl border-2 border-slate-300 bg-slate-50 text-2xl font-semibold text-slate-900 hover:bg-slate-100"
              >
                <span aria-hidden="true">🖼️</span>
                <span>앨범 선택</span>
              </button>
            </div>

            {selectedFile && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-lg text-emerald-800">
                선택된 사진: {selectedFile.name}
              </p>
            )}

            {previewUrl && (
              <img
                src={previewUrl}
                alt="선택한 인바디 미리보기"
                className="mx-auto max-h-80 w-auto rounded-xl border border-slate-200"
              />
            )}

              <button
                type="button"
                onClick={handleStartOcr}
                className="h-[64px] w-full rounded-xl bg-emerald-600 text-2xl font-semibold text-white hover:bg-emerald-700"
              >
                OCR 시작
              </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-10 text-center">
            <p className="text-3xl font-semibold text-slate-900">OCR 처리 중입니다</p>
            <p className="mt-3 text-xl text-slate-600">잠시만 기다려주세요.</p>
          </div>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm">
              <p className="text-xl font-bold text-blue-800">2) OCR 결과 확인 후 제출해주세요.</p>
              <p className="mt-1 text-base text-blue-700">앞/뒤/옆 사진은 이 화면에서 업로드됩니다.</p>
            </div>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">휴대폰번호</span>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                placeholder="01012345678"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">스폰서명</span>
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">체중 (kg)</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">골격근량 (kg)</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={skeletalMuscleMass}
                onChange={(e) => setSkeletalMuscleMass(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xl font-medium text-slate-900">체지방량 (kg)</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={bodyFatMass}
                onChange={(e) => setBodyFatMass(e.target.value)}
                className="h-[64px] w-full rounded-xl border border-slate-300 px-4 text-[22px]"
                required
              />
            </label>

            <fieldset className="rounded-xl border border-slate-300 p-4">
              <legend className="px-2 text-xl font-medium text-slate-900">기록 유형</legend>
              <div className="mt-2 grid gap-3">
                <label className="flex h-[64px] items-center gap-4 rounded-xl border border-slate-300 px-4 text-[22px]">
                  <input
                    type="radio"
                    name="recordType"
                    checked={recordType === 'start'}
                    onChange={() => setRecordType('start')}
                    className="h-6 w-6"
                  />
                  <span>시작 인바디</span>
                </label>
                <label className="flex h-[64px] items-center gap-4 rounded-xl border border-slate-300 px-4 text-[22px]">
                  <input
                    type="radio"
                    name="recordType"
                    checked={recordType === 'end'}
                    onChange={() => setRecordType('end')}
                    className="h-6 w-6"
                  />
                  <span>종료 인바디</span>
                </label>
              </div>
            </fieldset>

            <section className="rounded-xl border border-slate-300 p-4">
              <p className="text-xl font-medium text-slate-900">{recordType === 'start' ? '시작' : '종료'} 인바디 전신 사진</p>
              <p className="mt-1 text-sm text-slate-600">앞면/뒷면/옆면 사진을 각각 1장씩 업로드해주세요.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(Object.keys(progressPhotoLabels) as ProgressPhotoKey[]).map((photoKey) => (
                  <label key={photoKey} className="block rounded-xl border border-slate-300 bg-slate-50 p-3">
                    <span className="mb-2 block text-base font-medium text-slate-800">{progressPhotoLabels[photoKey]}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        void handleProgressPhotoSelect(photoKey, e.target.files?.[0] || null);
                      }}
                      className="block w-full text-sm text-slate-700"
                      required
                    />
                    <span className="mt-2 block truncate text-xs text-slate-600">
                      {uploadingPhotoKey === photoKey
                        ? '업로드 중...'
                        : progressPhotoUrls[photoKey]
                          ? '업로드 완료'
                          : progressPhotos[photoKey]?.name || '선택된 파일 없음'}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={Boolean(uploadingPhotoKey)}
              className="h-[68px] w-full rounded-xl bg-blue-700 text-2xl font-semibold text-white hover:bg-blue-800"
            >
              제출하기
            </button>
          </form>
        )}

        {step === 'submitted' && (
          <div className="space-y-4 py-8 text-center">
            <p className="text-3xl font-semibold text-emerald-700">제출 완료</p>
            <p className="text-xl text-slate-700">기록이 정상적으로 저장되었습니다.</p>
            <button
              type="button"
              onClick={resetForNewUpload}
              className="h-[64px] w-full rounded-xl bg-slate-700 text-2xl font-semibold text-white hover:bg-slate-800"
            >
              다른 기록 올리기
            </button>
          </div>
        )}
      </section>

      {message && (
        <p
          className={`mt-4 text-center text-xl font-medium ${
            messageStatus === 'error' ? 'text-red-600' : 'text-emerald-700'
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}
