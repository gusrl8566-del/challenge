'use client';

import { FormEvent, MouseEvent, WheelEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminAuthApi, adminApi, inbodyApi } from '@/lib/api';
import { clearAdminSession } from '@/lib/admin-auth';
import { InbodyData, ParticipantDetail } from '@/types';

type FormState = {
  beforeWeight: string;
  beforeSkeletalMuscleMass: string;
  beforeBodyFatMass: string;
  afterWeight: string;
  afterSkeletalMuscleMass: string;
  afterBodyFatMass: string;
};

type InbodyPreviewImage = {
  key: 'before' | 'after';
  label: string;
  imageUrl: string | null;
  filename?: string | null;
};

type ViewerTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type DragState = {
  key: InbodyPreviewImage['key'];
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
};

function toInputValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMetric(value: number) {
  return value.toFixed(1);
}

function deltaText(value: number, unit: string, kind: 'up' | 'down') {
  const abs = Math.abs(value);
  if (kind === 'up') {
    return `${value >= 0 ? '+' : '-'}${formatMetric(abs)}${unit}`;
  }
  return `${value >= 0 ? '-' : '+'}${formatMetric(abs)}${unit}`;
}

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

function getDefaultViewerTransform(): ViewerTransform {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

export default function AdminParticipantDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const participantId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [participant, setParticipant] = useState<ParticipantDetail | null>(null);
  const [form, setForm] = useState<FormState>({
    beforeWeight: '',
    beforeSkeletalMuscleMass: '',
    beforeBodyFatMass: '',
    afterWeight: '',
    afterSkeletalMuscleMass: '',
    afterBodyFatMass: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [viewerTransforms, setViewerTransforms] = useState<
    Record<InbodyPreviewImage['key'], ViewerTransform>
  >({
    before: getDefaultViewerTransform(),
    after: getDefaultViewerTransform(),
  });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [message, setMessage] = useState('');
  const [messageStatus, setMessageStatus] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const currentParticipantId = typeof participantId === 'string' ? participantId : null;
    if (!currentParticipantId) {
      return;
    }

    async function fetchData(id: string) {
      try {
        await adminAuthApi.validateToken();
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;

        if (status === 401 || status === 403) {
          clearAdminSession();
          router.push('/admin/login');
          return;
        }

        console.error('토큰 검증에 실패했습니다:', error);
        setMessageStatus('error');
        setMessage('인증 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      try {
        const [participantData, inbodyData] = await Promise.all([
          adminApi.getParticipant(id),
          inbodyApi.getByParticipant(id),
        ]);

        const data: InbodyData | null = inbodyData ?? participantData.inbodyData ?? null;

        setParticipant({
          ...participantData,
          inbodyData: data,
        });
        setParticipantName(participantData.name || '');
        setSponsorName(participantData.sponsorName || '');

        setForm({
          beforeWeight: toInputValue(data?.beforeWeight),
          beforeSkeletalMuscleMass: toInputValue(data?.beforeSkeletalMuscleMass),
          beforeBodyFatMass: toInputValue(data?.beforeBodyFatMass),
          afterWeight: toInputValue(data?.afterWeight),
          afterSkeletalMuscleMass: toInputValue(data?.afterSkeletalMuscleMass),
          afterBodyFatMass: toInputValue(data?.afterBodyFatMass),
        });
      } catch (error) {
        console.error('참가자 상세 조회에 실패했습니다:', error);
        setMessageStatus('error');
        setMessage('참가자 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    }

    fetchData(currentParticipantId);
  }, [participantId, router]);

  const metrics = useMemo(() => {
    const weightChange = toNumber(form.afterWeight) - toNumber(form.beforeWeight);
    const muscleGain =
      toNumber(form.afterSkeletalMuscleMass) - toNumber(form.beforeSkeletalMuscleMass);
    const fatLoss = toNumber(form.beforeBodyFatMass) - toNumber(form.afterBodyFatMass);

    return {
      weightChange,
      muscleGain,
      fatLoss,
    };
  }, [form]);

  const hasInbodyValues = useMemo(() => {
    return [
      form.beforeWeight,
      form.beforeSkeletalMuscleMass,
      form.beforeBodyFatMass,
      form.afterWeight,
      form.afterSkeletalMuscleMass,
      form.afterBodyFatMass,
    ].every((value) => value.trim() !== '');
  }, [form]);

  const comparisonImageGroups = useMemo(() => {
    const inbody = participant?.inbodyData;
    if (!inbody) {
      return [] as {
        key: 'front' | 'back' | 'side';
        label: string;
        beforeUrl: string | null;
        afterUrl: string | null;
      }[];
    }

    return [
      {
        key: 'front' as const,
        label: '앞면',
        beforeUrl: resolveImageUrl(inbody.beforeFrontImageUrl),
        afterUrl: resolveImageUrl(inbody.afterFrontImageUrl),
      },
      {
        key: 'back' as const,
        label: '뒷면',
        beforeUrl: resolveImageUrl(inbody.beforeBackImageUrl),
        afterUrl: resolveImageUrl(inbody.afterBackImageUrl),
      },
      {
        key: 'side' as const,
        label: '옆면',
        beforeUrl: resolveImageUrl(inbody.beforeSideImageUrl),
        afterUrl: resolveImageUrl(inbody.afterSideImageUrl),
      },
    ];
  }, [participant?.inbodyData]);

  const inbodyPreviewImages = useMemo(() => {
    const inbody = participant?.inbodyData;
    if (!inbody) {
      return [] as InbodyPreviewImage[];
    }

    return [
      {
        key: 'before' as const,
        label: '시작 인바디',
        imageUrl: resolveImageUrl(inbody.beforeImageUrl),
        filename: inbody.beforeImageFilename,
      },
      {
        key: 'after' as const,
        label: '종료 인바디',
        imageUrl: resolveImageUrl(inbody.afterImageUrl),
        filename: inbody.afterImageFilename,
      },
    ];
  }, [participant?.inbodyData]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleViewerWheel = (key: InbodyPreviewImage['key'], event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    setViewerTransforms((prev) => {
      const current = prev[key];
      const nextScale = current.scale - event.deltaY * 0.0015;
      const scale = Math.min(4, Math.max(0.8, Number(nextScale.toFixed(2))));

      return {
        ...prev,
        [key]: {
          ...current,
          scale,
        },
      };
    });
  };

  const handleViewerMouseDown = (
    key: InbodyPreviewImage['key'],
    event: MouseEvent<HTMLImageElement>,
  ) => {
    const transform = viewerTransforms[key];
    if (transform.scale <= 1) {
      return;
    }

    setDragState({
      key,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    });
  };

  const handleViewerMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    setViewerTransforms((prev) => ({
      ...prev,
      [dragState.key]: {
        ...prev[dragState.key],
        offsetX: dragState.offsetX + (event.clientX - dragState.pointerX),
        offsetY: dragState.offsetY + (event.clientY - dragState.pointerY),
      },
    }));
  };

  const resetViewerTransform = (key: InbodyPreviewImage['key']) => {
    setViewerTransforms((prev) => ({
      ...prev,
      [key]: getDefaultViewerTransform(),
    }));
    setDragState(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!participantId) {
      setMessageStatus('error');
      setMessage('참가자 ID를 찾지 못했습니다. 목록에서 다시 선택해 주세요.');
      return;
    }

    if (!sponsorName.trim()) {
      setMessageStatus('error');
      setMessage('스폰서명을 입력해 주세요.');
      return;
    }

    if (!participantName.trim()) {
      setMessageStatus('error');
      setMessage('참가자명을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      setMessageStatus(null);

      await inbodyApi.submit(participantId, {
        before: {
          weight: toNumber(form.beforeWeight),
          skeletalMuscleMass: toNumber(form.beforeSkeletalMuscleMass),
          bodyFatMass: toNumber(form.beforeBodyFatMass),
        },
        after: {
          weight: toNumber(form.afterWeight),
          skeletalMuscleMass: toNumber(form.afterSkeletalMuscleMass),
          bodyFatMass: toNumber(form.afterBodyFatMass),
        },
      });

      await adminApi.updateProfile(participantId, {
        name: participantName.trim(),
        sponsorName: sponsorName.trim(),
      });

      const refreshed = await inbodyApi.getByParticipant(participantId);
      const refreshedParticipant = await adminApi.getParticipant(participantId);

      setParticipant((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          name: refreshedParticipant.name,
          sponsorName: refreshedParticipant.sponsorName,
          inbodyData: refreshed,
        };
      });

      setMessageStatus('success');
      setMessage('측정 데이터가 저장되었습니다.');
    } catch (error) {
      console.error('측정 데이터 저장에 실패했습니다:', error);
      setMessageStatus('error');
      setMessage('저장에 실패했습니다. 입력값을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-slate-600">참가자 정보를 찾지 못했습니다.</p>
        <Link href="/admin" className="mt-4 inline-flex text-primary-600 hover:underline">
          관리자 대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">참가자 상세</p>
            <h1 className="text-2xl font-bold text-slate-900">{participant.name}</h1>
            <p className="text-sm text-slate-600">{participant.email}</p>
            <p className="text-sm text-slate-600">스폰서: {participant.sponsorName || '-'}</p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            목록으로
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">체중 변화</p>
          {hasInbodyValues ? (
            <p
              className={`mt-2 text-2xl font-bold ${
                metrics.weightChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {metrics.weightChange >= 0 ? '+' : ''}
              {formatMetric(metrics.weightChange)}kg
            </p>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-400">데이터 없음</p>
          )}
          <p className="mt-1 text-xs text-slate-500">After - Before</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">골격근량 변화</p>
          {hasInbodyValues ? (
            <p
              className={`mt-2 text-2xl font-bold ${
                metrics.muscleGain >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {metrics.muscleGain >= 0 ? '+' : ''}
              {formatMetric(metrics.muscleGain)}kg
            </p>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-400">데이터 없음</p>
          )}
          <p className="mt-1 text-xs text-slate-500">After - Before</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">체지방량 변화</p>
          {hasInbodyValues ? (
            <p
              className={`mt-2 text-2xl font-bold ${
                metrics.fatLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {deltaText(metrics.fatLoss, 'kg', 'down')}
            </p>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-400">데이터 없음</p>
          )}
          <p className="mt-1 text-xs text-slate-500">Before - After (감소가 플러스)</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">인바디 원본</h2>
          <p className="mt-1 text-sm text-slate-600">영역 안에서 바로 마우스 휠로 확대/축소하고, 확대된 상태에서 드래그로 이동할 수 있습니다.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {inbodyPreviewImages.map((image) => (
            <article key={image.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{image.label}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {image.filename?.trim() ? image.filename : '파일명 정보 없음'}
                </p>
              </div>

              {image.imageUrl ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <p className="text-xs text-slate-500">휠 확대/축소, 더블클릭 원위치</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {Math.round(viewerTransforms[image.key].scale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => resetViewerTransform(image.key)}
                        className="inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        원위치
                      </button>
                    </div>
                  </div>
                  <div
                    className="h-80 overflow-hidden bg-slate-100"
                    onWheel={(event) => handleViewerWheel(image.key, event)}
                    onMouseMove={handleViewerMouseMove}
                    onMouseUp={() => setDragState(null)}
                    onMouseLeave={() => setDragState(null)}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.label}
                      onMouseDown={(event) => handleViewerMouseDown(image.key, event)}
                      onDoubleClick={() => resetViewerTransform(image.key)}
                      draggable={false}
                      className={`h-full w-full select-none object-contain ${
                        viewerTransforms[image.key].scale > 1
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-zoom-in'
                      }`}
                      style={{
                        transform: `translate(${viewerTransforms[image.key].offsetX}px, ${viewerTransforms[image.key].offsetY}px) scale(${viewerTransforms[image.key].scale})`,
                        transformOrigin: 'center center',
                        transition:
                          dragState?.key === image.key ? 'none' : 'transform 120ms ease-out',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  이미지 없음
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">시작/종료 전신 사진 비교</h2>
          <p className="mt-1 text-sm text-slate-600">시작 인바디와 종료 인바디의 앞/뒤/옆 사진을 좌우로 비교합니다.</p>
        </div>

        <div className="grid gap-4">
          {comparisonImageGroups.map((group) => (
            <article key={group.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">{group.label} 비교</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">필그레잇 전 {group.label}사진</p>
                  {group.beforeUrl ? (
                    <img
                      src={group.beforeUrl}
                      alt={`필그레잇 전 ${group.label}사진`}
                      className="h-64 w-full rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                      이미지 없음
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">필그레잇 후 {group.label}사진</p>
                  {group.afterUrl ? (
                    <img
                      src={group.afterUrl}
                      alt={`필그레잇 후 ${group.label}사진`}
                      className="h-64 w-full rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                      이미지 없음
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!hasInbodyValues && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          아직 BEFORE/AFTER 측정값이 없어 변화 지표를 표시할 수 없습니다. 값을 입력하고 저장하면 즉시 반영됩니다.
        </p>
      )}

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

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2"
      >
        <div className="lg:col-span-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">참가자명</span>
            <input
              type="text"
              value={participantName}
              onChange={(event) => setParticipantName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
        </div>

        <div className="lg:col-span-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">스폰서명</span>
            <input
              type="text"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Before</h2>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">체중 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.beforeWeight}
              onChange={(event) => handleChange('beforeWeight', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">골격근량 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.beforeSkeletalMuscleMass}
              onChange={(event) => handleChange('beforeSkeletalMuscleMass', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">체지방량 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.beforeBodyFatMass}
              onChange={(event) => handleChange('beforeBodyFatMass', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">After</h2>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">체중 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.afterWeight}
              onChange={(event) => handleChange('afterWeight', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">골격근량 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.afterSkeletalMuscleMass}
              onChange={(event) => handleChange('afterSkeletalMuscleMass', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">체지방량 (kg)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.afterBodyFatMass}
              onChange={(event) => handleChange('afterBodyFatMass', event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </label>
        </section>

        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-300"
          >
            {saving ? '저장 중...' : '변경 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
