import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppSidebar from '@/components/app-sidebar';
import NewScriptForm from './new-script-form';
import DeleteScriptButton from './delete-script-button';

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora mesmo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} sem`;
  return date.toLocaleDateString('pt-BR');
}

function ProjectLinks({ id, projectType, dark }: { id: string; projectType: string; dark?: boolean }) {
  const base = 'px-3 py-1.5 text-[11px] font-semibold tracking-wide border-[1.5px]';
  const outline = dark ? 'border-[#F2EDE1] text-[#F2EDE1]' : 'border-ink text-ink';
  const filled = dark ? 'border-[#F2EDE1] bg-[#F2EDE1] text-ink' : 'border-ink bg-ink text-[#F2EDE1]';
  return (
    <div className="flex flex-wrap gap-2">
      {projectType === 'SERIES' && (
        <Link href={`/scripts/${id}?mode=pitch`} className={`${base} ${outline}`}>
          PROPOSTA
        </Link>
      )}
      <Link href={`/scripts/${id}?mode=plot`} className={`${base} ${outline}`}>
        PLOT
      </Link>
      {projectType === 'SERIES' && (
        <Link href={`/scripts/${id}?mode=outline`} className={`${base} ${outline}`}>
          ESBOÇO DA TRAMA
        </Link>
      )}
      <Link href={`/scripts/${id}?mode=full`} className={`${base} ${filled}`}>
        ROTEIRO
      </Link>
    </div>
  );
}

export default async function ScriptsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const scripts = await prisma.script.findMany({
    where: { ownerId: (session.user as any).id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { pages: true, characters: true } } }
  });

  const [current, ...rest] = scripts;

  return (
    <div className="flex min-h-screen w-full bg-paper">
      <AppSidebar userEmail={session.user.email} />

      <div className="flex-1 px-12 py-12">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">Seus roteiros</h1>
        <p className="mb-8 text-sm text-[#8F8878]">
          {scripts.length > 0
            ? 'Continue de onde parou ou comece uma história nova.'
            : 'Nenhum roteiro ainda — comece sua primeira história abaixo.'}
        </p>

        {current && (
          <div className="mb-10">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-[#8F8878]">EM ANDAMENTO</div>
            <div className="flex flex-col justify-between gap-4 border-[1.5px] border-ink bg-ink p-6 text-[#F2EDE1] sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="font-display text-2xl font-bold">{current.title}</div>
                  <DeleteScriptButton
                    scriptId={current.id}
                    title={current.title}
                    className="text-[11px] font-semibold text-[#E39B8F] hover:text-[#F2C4BA] disabled:opacity-50"
                  />
                </div>
                <div className="mt-1 text-sm text-[#C9C2AE]">
                  editado {timeAgo(current.updatedAt)} · {current._count.pages} páginas ·{' '}
                  {current._count.characters} personagens
                </div>
              </div>
              <ProjectLinks id={current.id} projectType={current.projectType} dark />
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div className="mb-10">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-[#8F8878]">OUTROS ROTEIROS</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {rest.map((s) => (
                <div key={s.id} className="flex flex-col gap-3 border-[1.5px] border-ink bg-white p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="font-display text-lg font-bold text-ink">{s.title}</div>
                      <DeleteScriptButton scriptId={s.id} title={s.title} />
                    </div>
                    <div className="text-xs text-[#8F8878]">
                      editado {timeAgo(s.updatedAt)} · {s._count.pages} páginas
                    </div>
                  </div>
                  <ProjectLinks id={s.id} projectType={s.projectType} />
                </div>
              ))}
            </div>
          </div>
        )}

        <NewScriptForm />
      </div>
    </div>
  );
}
