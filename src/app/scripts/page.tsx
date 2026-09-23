import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import NewScriptForm from './new-script-form';

export default async function ScriptsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const scripts = await prisma.script.findMany({
    where: { ownerId: (session.user as any).id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { pages: true } } }
  });

  return (
    <div className="min-h-screen bg-paper px-12 py-12">
      <h1 className="mb-8 font-display text-2xl font-bold text-ink">Seus roteiros</h1>

      {scripts.length > 0 && (
        <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {scripts.map((s) => (
            <Link key={s.id} href={`/scripts/${s.id}`} className="border-[1.5px] border-ink bg-white p-4">
              <div className="font-display text-lg font-bold text-ink">{s.title}</div>
              <div className="text-xs text-[#8F8878]">{s._count.pages} páginas</div>
            </Link>
          ))}
        </div>
      )}

      <NewScriptForm />
    </div>
  );
}
