import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const scripts = await prisma.script.findMany({
    where: { ownerId: (session.user as any).id },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { pages: true } } }
  });

  return NextResponse.json(scripts);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { title, pageCount, projectType } = await req.json();
  const type = projectType === 'GRAPHIC_NOVEL' ? 'GRAPHIC_NOVEL' : 'SERIES';
  // Série define páginas edição por edição depois; Graphic Novel define tudo já na criação.
  const count = type === 'GRAPHIC_NOVEL' ? Math.max(1, Math.min(80, Number(pageCount) || 1)) : 0;

  try {
    const script = await prisma.$transaction(async (tx) => {
      const created = await tx.script.create({
        data: {
          title: (title || '').trim() || 'Sem Título',
          projectType: type,
          ownerId: (session.user as any).id
        }
      });

      const edition = await tx.edition.create({
        data: { scriptId: created.id, number: 1, subtitle: '', text: '' }
      });

      for (let i = 0; i < count; i++) {
        await tx.page.create({
          data: {
            scriptId: created.id,
            editionId: edition.id,
            number: i + 1,
            plotText: '',
            blocks: { create: [{ order: 0, type: 'QUADRO' as const, number: 1, text: '' }] }
          }
        });
      }

      return tx.script.findUniqueOrThrow({
        where: { id: created.id },
        include: { pages: { include: { blocks: true } } }
      });
    });

    return NextResponse.json(script);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return NextResponse.json(
        { error: 'Sua sessão expirou. Faça login novamente.' },
        { status: 401 }
      );
    }
    throw err;
  }
}
