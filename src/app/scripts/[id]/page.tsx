import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditorClient from './editor-client';

export default async function ScriptPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { mode?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: {
      pages: { orderBy: { number: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
      characters: { orderBy: { name: 'asc' } },
      pitches: { orderBy: { version: 'desc' } },
      editions: { orderBy: { number: 'asc' } }
    }
  });

  if (!script || script.ownerId !== (session.user as any).id) redirect('/scripts');

  const requestedMode =
    searchParams.mode === 'plot'
      ? 'PLOT'
      : searchParams.mode === 'outline'
        ? 'OUTLINE'
        : searchParams.mode === 'pitch'
          ? 'PITCH'
          : 'FULL';

  // Graphic Novel é single issue: só Roteiro e Plot existem.
  const initialMode =
    script.projectType === 'GRAPHIC_NOVEL' && (requestedMode === 'OUTLINE' || requestedMode === 'PITCH')
      ? 'FULL'
      : requestedMode;

  return (
    <EditorClient
      initialMode={initialMode}
      initialScript={{
        id: script.id,
        title: script.title,
        projectType: script.projectType,
        pages: script.pages.map((p) => ({
          id: p.id,
          editionId: p.editionId,
          number: p.number,
          plotText: p.plotText || '',
          blocks: p.blocks.map((b) => ({
            id: b.id,
            type: b.type as 'QUADRO' | 'DIALOGO' | 'ONOMATOPEIA',
            number: b.number ?? undefined,
            character: b.character ?? undefined,
            text: b.text
          }))
        })),
        characters: script.characters.map((c) => ({ id: c.id, name: c.name, description: c.description || '' })),
        pitchDraft: script.pitchDraft,
        pitchVersions: script.pitches.map((p) => ({
          id: p.id,
          version: p.version,
          text: p.text,
          createdAt: p.createdAt.toISOString()
        })),
        editions: script.editions.length
          ? script.editions.map((e) => ({ id: e.id, number: e.number, subtitle: e.subtitle || '', text: e.text }))
          : [{ id: 'new-1', number: 1, subtitle: '', text: '' }]
      }}
    />
  );
}
