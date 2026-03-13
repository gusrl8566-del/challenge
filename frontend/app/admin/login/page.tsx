'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuthApi } from '@/lib/api';
import { setAdminSession } from '@/lib/admin-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [superCode, setSuperCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminAuthApi.login({
        super_code: superCode,
      });

      setAdminSession(response.access_token);
      router.push('/admin');
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.message || '로그인에 실패했습니다. 입력 정보를 확인해 주세요.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">관리자 로그인</h1>
        <p className="mt-2 text-sm text-slate-600">슈퍼코드로 로그인하세요.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">슈퍼코드</label>
            <input
              type="password"
              required
              value={superCode}
              onChange={(event) => setSuperCode(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="ADMIN_SUPER_CODE 입력"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
