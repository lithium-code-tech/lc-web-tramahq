import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const MARGIN = 72; // 1 polegada
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = BODY_SIZE * 1.5;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: { pages: { orderBy: { number: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } } }
  });

  if (!script || script.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') === 'plot' ? 'plot' : 'full';

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);
  const fontBold = await pdf.embedFont(StandardFonts.CourierBold);
  const fontOblique = await pdf.embedFont(StandardFonts.CourierOblique);

  for (const page of script.pages) {
    let pdfPage: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const drawHeader = () => {
      pdfPage.drawText(script.title.toUpperCase(), {
        x: MARGIN,
        y: PAGE_HEIGHT - 50,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.4)
      });
      const label = 'PÁGINA ' + page.number;
      pdfPage.drawText(label, {
        x: PAGE_WIDTH - MARGIN - fontBold.widthOfTextAtSize(label, 14),
        y: PAGE_HEIGHT - 50,
        size: 14,
        font: fontBold
      });
    };
    drawHeader();
    y -= 36;

    const ensureSpace = (needed: number) => {
      if (y - needed < MARGIN) {
        pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        drawHeader();
        y -= 36;
        pdfPage.drawText('(continuação)', { x: MARGIN, y, size: 9, font: fontOblique, color: rgb(0.5, 0.5, 0.5) });
        y -= 22;
      }
    };

    if (mode === 'plot') {
      const lines = wrapText(page.plotText || '(sem resumo)', fontOblique, BODY_SIZE, CONTENT_WIDTH);
      for (const line of lines) {
        ensureSpace(LINE_HEIGHT);
        pdfPage.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font: fontOblique });
        y -= LINE_HEIGHT;
      }
      continue;
    }

    for (const block of page.blocks) {
      if (block.type === 'QUADRO') {
        ensureSpace(LINE_HEIGHT * 2);
        pdfPage.drawText('QUADRO ' + block.number, {
          x: MARGIN,
          y,
          size: BODY_SIZE,
          font: fontBold,
          color: rgb(0.17, 0.3, 0.49)
        });
        y -= LINE_HEIGHT;
        for (const line of wrapText(block.text, fontOblique, BODY_SIZE, CONTENT_WIDTH)) {
          ensureSpace(LINE_HEIGHT);
          pdfPage.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font: fontOblique });
          y -= LINE_HEIGHT;
        }
        y -= LINE_HEIGHT * 0.4;
      } else if (block.type === 'DIALOGO') {
        ensureSpace(LINE_HEIGHT);
        const name = (block.character || '').toUpperCase();
        const nameWidth = fontBold.widthOfTextAtSize(name, BODY_SIZE);
        pdfPage.drawText(name, { x: MARGIN + (CONTENT_WIDTH - nameWidth) / 2, y, size: BODY_SIZE, font: fontBold });
        y -= LINE_HEIGHT;

        const dialogueWidth = CONTENT_WIDTH * 0.6;
        const dialogueX = MARGIN + (CONTENT_WIDTH - dialogueWidth) / 2;
        for (const line of wrapText(block.text, font, BODY_SIZE, dialogueWidth)) {
          ensureSpace(LINE_HEIGHT);
          const lineWidth = font.widthOfTextAtSize(line, BODY_SIZE);
          pdfPage.drawText(line, { x: dialogueX + (dialogueWidth - lineWidth) / 2, y, size: BODY_SIZE, font });
          y -= LINE_HEIGHT;
        }
        y -= LINE_HEIGHT * 0.4;
      } else if (block.type === 'ONOMATOPEIA') {
        ensureSpace(LINE_HEIGHT);
        pdfPage.drawText('SFX: ' + (block.text || '').toUpperCase(), {
          x: MARGIN,
          y,
          size: BODY_SIZE,
          font: fontBold,
          color: rgb(0.64, 0.23, 0.18)
        });
        y -= LINE_HEIGHT * 1.4;
      }
    }
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${script.title.replace(/[^a-z0-9]+/gi, '-')}.pdf"`
    }
  });
}
