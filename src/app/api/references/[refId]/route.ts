import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { REFERENCE_SELECT } from '@/lib/references';

// A referência só é acessível pelo dono do roteiro a que ela pertence.
async function requireOwnedReference(refId: string, userId: string) {
  const ref = await prisma.reference.findUnique({
    where: { id: refId },
    select: { id: true, script: { select: { ownerId: true } } }
  });
  if (!ref || ref.script.ownerId !== userId) return null;
  return ref;
}

export async function GET(req: Request, { params }: { params: { refId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owned = await requireOwnedReference(params.refId, (session.user as any).id);
  if (!owned) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const thumb = new URL(req.url).searchParams.has('thumb');
  const image = await prisma.reference.findUnique({
    where: { id: params.refId },
    select: thumb ? { thumb: true, thumbMimeType: true } : { data: true, mimeType: true }
  });
  if (!image) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const bytes = thumb ? (image as { thumb: Buffer }).thumb : (image as { data: Buffer }).data;
  const type = thumb ? (image as { thumbMimeType: string }).thumbMimeType : (image as { mimeType: string }).mimeType;

  // O conteúdo de um id nunca muda (editar só mexe em legenda/ligação), então o
  // navegador pode guardar a imagem de vez.
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=31536000, immutable'
    }
  });
}

export async function PATCH(req: Request, { params }: { params: { refId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owned = await requireOwnedReference(params.refId, (session.user as any).id);
  if (!owned) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const body = (await req.json()) as {
    caption?: string;
    characterName?: string | null;
    editionNumber?: number | null;
    pageNumber?: number | null;
  };

  const data: { caption?: string; characterName?: string | null; editionNumber?: number | null; pageNumber?: number | null } = {};
  if (typeof body.caption === 'string') data.caption = body.caption.trim();
  if ('characterName' in body || 'editionNumber' in body || 'pageNumber' in body) {
    const characterName = body.characterName?.trim() || null;
    const isPage =
      !characterName && Number.isInteger(body.editionNumber) && Number.isInteger(body.pageNumber);
    data.characterName = characterName;
    data.editionNumber = isPage ? body.editionNumber! : null;
    data.pageNumber = isPage ? body.pageNumber! : null;
  }

  const updated = await prisma.reference.update({ where: { id: params.refId }, data, select: REFERENCE_SELECT });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { refId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owned = await requireOwnedReference(params.refId, (session.user as any).id);
  if (!owned) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  await prisma.reference.delete({ where: { id: params.refId } });
  return NextResponse.json({ ok: true });
}
