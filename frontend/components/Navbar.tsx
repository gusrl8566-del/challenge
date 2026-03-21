'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { hasAdminSession } from '@/lib/admin-auth';

const participantNavItems = [
  { href: '/', label: '홈' },
  { href: '/upload', label: '데이터 업로드' },
];

const adminNavItems = [
  { href: '/rankings', label: '순위' },
  { href: '/admin', label: '관리자' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAdminSession());
  }, [pathname]);

  const navItems = isAdmin ? adminNavItems : participantNavItems;

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600">
            InBody Challenge
          </Link>
          <div className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary-600',
                  pathname === item.href
                    ? 'text-primary-600'
                    : 'text-gray-600'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
