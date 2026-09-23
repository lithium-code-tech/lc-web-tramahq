import Link from 'next/link';
import LogoutButton from './logout-button';

export default function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col gap-8 bg-sidebar p-5 text-[#F2EDE1]">
      <Link href="/scripts" className="font-display text-xl font-bold">
        TramaHQ
      </Link>

      <nav className="flex flex-col gap-1">
        <Link
          href="/scripts"
          className="border-l-[3px] px-3 py-2.5 text-sm font-semibold"
          style={{ borderColor: '#2B4C7E', background: 'rgba(43,76,126,0.22)' }}
        >
          Meus roteiros
        </Link>
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-[#3A362E] pt-4">
        {userEmail && <div className="truncate text-[11.5px] text-[#6F6A5B]">{userEmail}</div>}
        <LogoutButton />
      </div>
    </div>
  );
}
