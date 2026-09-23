import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import EditorClient from './editor-client';

export default async function ScriptPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: {
      pages: { orderBy: { number: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
      characters: { orderBy: { name: 'asc' } }
    }
  });

  if (!script || script.ownerId !== (session.user as any).id) redirect('/scripts');

  return (
    <EditorClient
      initialScript={{
        id: script.id,
        title: script.title,
        pages: script.pages.map((p) => ({
          id: p.id,
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
        characters: script.characters.map((c) => ({ id: c.id, name: c.name }))
      }}
    />
  );
}
