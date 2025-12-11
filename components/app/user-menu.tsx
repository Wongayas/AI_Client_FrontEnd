'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm">{user?.email}</span>
      <button
        onClick={handleLogout}
        className="text-sm font-medium text-red-600 hover:text-red-700"
      >
        Logout
      </button>
    </div>
  );
}
