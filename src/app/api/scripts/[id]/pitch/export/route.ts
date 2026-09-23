import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { wrapText, drawCentered } from '@/lib/pdf-text';

const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = BODY_SIZE * 1.5;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, email: true } }, pitches: { orderBy: { version: 'desc' }, take: 1 } }
  });

  if (!script || script.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  }

  const latest = script.pitches[0];
  if (!latest) return NextResponse.json({ error: 'Nenhuma versão da proposta foi salva ainda.' }, { status: 400 });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const titleLines = wrapText(script.title.toUpperCase(), fontBold, 22, CONTENT_WIDTH);
  for (const line of titleLines) {
    drawCentered(pdfPage, line, y, fontBold, 22, PAGE_WIDTH);
    y -= 28;
  }

  y -= 6;
  const authorName = script.owner.name || script.owner.email || '';
  const meta = `Proposta escrita v${latest.version} — ${latest.createdAt.toLocaleDateString('pt-BR')}`;
  drawCentered(pdfPage, meta, y, font, 11, PAGE_WIDTH, rgb(0.35, 0.35, 0.32));
  y -= 18;
  if (authorName) {
    drawCentered(pdfPage, authorName, y, fontItalic, 11, PAGE_WIDTH, rgb(0.35, 0.35, 0.32));
    y -= 18;
  }

  y -= 24;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const paragraphs = latest.text.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const rawLines = paragraph.split('\n');
    for (const rawLine of rawLines) {
      for (const line of wrapText(rawLine, font, BODY_SIZE, CONTENT_WIDTH)) {
        ensureSpace(LINE_HEIGHT);
        pdfPage.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font });
        y -= LINE_HEIGHT;
      }
    }
    y -= LINE_HEIGHT * 0.6;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${script.title.replace(/[^a-z0-9]+/gi, '-')}-proposta.pdf"`
    }
  });
}
