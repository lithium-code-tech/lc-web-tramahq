'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={className || 'text-left text-[11.5px] font-semibold text-[#B7AF9A] hover:text-[#F2EDE1]'}
    >
      Sair
    </button>
  );
}
