import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireOwner(id: string, userId: string) {
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script || script.ownerId !== userId) return null;
  return script;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: {
      pages: { orderBy: { number: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
      characters: { orderBy: { name: 'asc' } }
    }
  });

  return NextResponse.json(script);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const body = await req.json();
  const { title, pages, characters, editions } = body as {
    title?: string;
    pages: {
      number: number;
      plotText: string;
      blocks: { type: 'QUADRO' | 'DIALOGO' | 'ONOMATOPEIA'; number?: number; character?: string; text: string }[];
    }[];
    characters: { name: string; description?: string }[];
    editions?: { number: number; subtitle?: string; text: string }[];
  };

  await prisma.$transaction(async (tx) => {
    if (title !== undefined) {
      await tx.script.update({ where: { id: params.id }, data: { title } });
    }

    // MVP: substitui o conteúdo inteiro a cada save (documento pequeno, simplicidade > eficiência)
    await tx.page.deleteMany({ where: { scriptId: params.id } });
    await tx.character.deleteMany({ where: { scriptId: params.id } });
    if (editions) await tx.edition.deleteMany({ where: { scriptId: params.id } });

    for (const page of pages) {
      await tx.page.create({
        data: {
          scriptId: params.id,
          number: page.number,
          plotText: page.plotText || '',
          blocks: {
            create: page.blocks.map((b, i) => ({
              order: i,
              type: b.type,
              number: b.number,
              character: b.character,
              text: b.text
            }))
          }
        }
      });
    }

    for (const ch of characters) {
      await tx.character.create({ data: { scriptId: params.id, name: ch.name, description: ch.description || '' } });
    }

    if (editions) {
      for (const ed of editions) {
        await tx.edition.create({
          data: { scriptId: params.id, number: ed.number, subtitle: ed.subtitle || '', text: ed.text }
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  await prisma.script.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
