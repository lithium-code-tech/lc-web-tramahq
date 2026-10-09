import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { REFERENCE_SELECT } from '@/lib/references';

// As imagens chegam já compactadas pelo navegador (WebP ~1600 px); o limite só barra abuso.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/webp', 'image/jpeg', 'image/png'];

async function requireOwner(id: string, userId: string) {
  const script = await prisma.script.findUnique({ where: { id } });
  if (!script || script.ownerId !== userId) return null;
  return script;
}

function optionalInt(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const refs = await prisma.reference.findMany({
    where: { scriptId: params.id },
    orderBy: { createdAt: 'asc' },
    select: REFERENCE_SELECT
  });
  return NextResponse.json(refs);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const form = await req.formData();
  const image = form.get('image');
  const thumb = form.get('thumb');
  if (!(image instanceof Blob) || !(thumb instanceof Blob)) {
    return NextResponse.json({ error: 'Imagem ausente.' }, { status: 400 });
  }
  if (!ALLOWED.includes(image.type) || !ALLOWED.includes(thumb.type)) {
    return NextResponse.json({ error: 'Formato de imagem não suportado.' }, { status: 400 });
  }
  if (image.size > MAX_BYTES || thumb.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Imagem grande demais.' }, { status: 413 });
  }

  const width = optionalInt(form.get('width'));
  const height = optionalInt(form.get('height'));
  if (!width || !height) return NextResponse.json({ error: 'Dimensões inválidas.' }, { status: 400 });

  const characterName = String(form.get('characterName') ?? '').trim() || null;
  const editionNumber = optionalInt(form.get('editionNumber'));
  const pageNumber = optionalInt(form.get('pageNumber'));
  const isPage = !characterName && editionNumber !== null && pageNumber !== null;

  const created = await prisma.reference.create({
    data: {
      scriptId: params.id,
      caption: String(form.get('caption') ?? '').trim(),
      characterName,
      editionNumber: isPage ? editionNumber : null,
      pageNumber: isPage ? pageNumber : null,
      mimeType: image.type,
      width,
      height,
      data: Buffer.from(await image.arrayBuffer()),
      thumbMimeType: thumb.type,
      thumb: Buffer.from(await thumb.arrayBuffer())
    },
    select: REFERENCE_SELECT
  });

  return NextResponse.json(created);
}

// Renomear um personagem leva as referências dele junto (a ligação é pelo nome).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const owner = await requireOwner(params.id, (session.user as any).id);
  if (!owner) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

  const { renameCharacter } = (await req.json()) as { renameCharacter?: { from: string; to: string } };
  const from = renameCharacter?.from?.trim();
  const to = renameCharacter?.to?.trim();
  if (!from || !to) return NextResponse.json({ error: 'Nada para renomear.' }, { status: 400 });

  const { count } = await prisma.reference.updateMany({
    where: { scriptId: params.id, characterName: from },
    data: { characterName: to }
  });
  return NextResponse.json({ ok: true, count });
}
