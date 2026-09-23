import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireOwner(id: string, userId: string) {
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script || script.ownerId !== userId) return null;
  return script;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const { text } = (await req.json()) as { text: string };
  await prisma.script.update({ where: { id: params.id }, data: { pitchDraft: text ?? '' } });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const { text } = (await req.json()) as { text: string };
  const body = (text ?? '').trim();
  if (!body) return NextResponse.json({ error: 'Escreva algo antes de salvar uma versão.' }, { status: 400 });

  const last = await prisma.pitch.findFirst({ where: { scriptId: params.id }, orderBy: { version: 'desc' } });
  const version = (last?.version ?? 0) + 1;

  const pitch = await prisma.$transaction(async (tx) => {
    const created = await tx.pitch.create({ data: { scriptId: params.id, version, text: body } });
    await tx.script.update({ where: { id: params.id }, data: { pitchDraft: body } });
    return created;
  });

  return NextResponse.json(pitch);
}
