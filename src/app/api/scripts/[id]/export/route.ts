import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFFont, PDFPage, PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { wrapText, drawCentered as drawCenteredBase } from '@/lib/pdf-text';

const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const MARGIN = 72; // 1 polegada
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = BODY_SIZE * 1.5;

function drawCentered(pdfPage: PDFPage, text: string, y: number, font: PDFFont, size: number, color?: ReturnType<typeof rgb>) {
  drawCenteredBase(pdfPage, text, y, font, size, PAGE_WIDTH, color);
}

function editionLabel(edition: { number: number; subtitle: string | null }) {
  return 'EDIÇÃO ' + edition.number + (edition.subtitle ? ': ' + edition.subtitle : '');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const script = await prisma.script.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, email: true } },
      editions: {
        orderBy: { number: 'asc' },
        include: { pages: { orderBy: { number: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } } }
      }
    }
  });

  if (!script || script.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get('mode');
  const mode = modeParam === 'plot' ? 'plot' : modeParam === 'outline' ? 'outline' : 'full';

  const multiEdition = script.editions.length > 1;
  const totalPages = script.editions.reduce((sum, e) => sum + e.pages.length, 0);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Courier);
  const fontBold = await pdf.embedFont(StandardFonts.CourierBold);
  const fontOblique = await pdf.embedFont(StandardFonts.CourierOblique);

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const titleLines = wrapText(script.title.toUpperCase(), fontBold, 28, CONTENT_WIDTH);
  let titleY = PAGE_HEIGHT / 2 + 20 + (titleLines.length - 1) * 17;
  for (const line of titleLines) {
    drawCentered(cover, line, titleY, fontBold, 28);
    titleY -= 34;
  }

  const authorName = script.owner.name || script.owner.email || '';
  if (authorName) {
    drawCentered(cover, 'roteiro de ' + authorName, titleY - 10, fontOblique, 13, rgb(0.3, 0.3, 0.28));
  }

  const formatLabel =
    mode === 'plot' ? 'FORMATO: PLOT' : mode === 'outline' ? 'FORMATO: ESBOÇO DA TRAMA' : 'FORMATO: ROTEIRO';
  drawCentered(cover, formatLabel, MARGIN + 34, font, 9, rgb(0.5, 0.5, 0.45));
  const countLabel = mode === 'outline' ? `${script.editions.length} edições` : `${totalPages} páginas`;
  drawCentered(
    cover,
    `${countLabel} · exportado em ${new Date().toLocaleDateString('pt-BR')}`,
    MARGIN + 18,
    font,
    9,
    rgb(0.5, 0.5, 0.45)
  );

  if (mode === 'plot') {
    let pdfPage: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const ensureSpace = (needed: number) => {
      if (y - needed < MARGIN) {
        pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    };

    for (const edition of script.editions) {
      if (multiEdition) {
        ensureSpace(LINE_HEIGHT * 2);
        pdfPage.drawText(editionLabel(edition), {
          x: MARGIN,
          y,
          size: 13,
          font: fontBold,
          color: rgb(0.17, 0.3, 0.49)
        });
        y -= LINE_HEIGHT * 1.8;
      }

      for (const page of edition.pages) {
        ensureSpace(LINE_HEIGHT * 2);
        pdfPage.drawText('PÁGINA ' + page.number, {
          x: MARGIN,
          y,
          size: BODY_SIZE,
          font: fontBold,
          color: rgb(0.17, 0.3, 0.49)
        });
        y -= LINE_HEIGHT;
        for (const line of wrapText(page.plotText || '(sem resumo)', fontOblique, BODY_SIZE, CONTENT_WIDTH)) {
          ensureSpace(LINE_HEIGHT);
          pdfPage.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font: fontOblique });
          y -= LINE_HEIGHT;
        }
        y -= LINE_HEIGHT * 1.2;
      }
    }

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${script.title.replace(/[^a-z0-9]+/gi, '-')}-plot.pdf"`
      }
    });
  }

  if (mode === 'outline') {
    for (const edition of script.editions) {
      let pdfPage: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;

      const drawHeader = () => {
        pdfPage.drawText(editionLabel(edition), { x: MARGIN, y: PAGE_HEIGHT - 50, size: 14, font: fontBold });
        pdfPage.drawText(script.title.toUpperCase(), {
          x: MARGIN,
          y: PAGE_HEIGHT - 50 - 18,
          size: 9,
          font,
          color: rgb(0.45, 0.45, 0.4)
        });
      };
      drawHeader();
      y -= 46;

      const ensureSpace = (needed: number) => {
        if (y - needed < MARGIN) {
          pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
          drawHeader();
          y -= 46;
          pdfPage.drawText('(continuação)', { x: MARGIN, y, size: 9, font: fontOblique, color: rgb(0.5, 0.5, 0.5) });
          y -= 22;
        }
      };

      const paragraphs = (edition.text || '(sem resumo)').split(/\n{2,}/);
      for (const paragraph of paragraphs) {
        for (const rawLine of paragraph.split('\n')) {
          for (const line of wrapText(rawLine, fontOblique, BODY_SIZE, CONTENT_WIDTH)) {
            ensureSpace(LINE_HEIGHT);
            pdfPage.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font: fontOblique });
            y -= LINE_HEIGHT;
          }
        }
        y -= LINE_HEIGHT * 0.6;
      }
    }

    const bytes = await pdf.save();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${script.title.replace(/[^a-z0-9]+/gi, '-')}-esboco-da-trama.pdf"`
      }
    });
  }

  for (const edition of script.editions) {
    if (multiEdition) {
      const divider = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawCentered(divider, 'EDIÇÃO ' + edition.number, PAGE_HEIGHT / 2 + 10, fontBold, 22);
      if (edition.subtitle) {
        drawCentered(divider, edition.subtitle, PAGE_HEIGHT / 2 - 18, fontOblique, 14, rgb(0.35, 0.35, 0.32));
      }
    }

    for (const page of edition.pages) {
      let pdfPage: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;

      const drawHeader = () => {
        const label = 'PÁGINA ' + page.number;
        pdfPage.drawText(label, {
          x: MARGIN,
          y: PAGE_HEIGHT - 50,
          size: 14,
          font: fontBold
        });
        const subtitle = multiEdition ? editionLabel(edition) + ' — ' + script.title.toUpperCase() : script.title.toUpperCase();
        pdfPage.drawText(subtitle, {
          x: MARGIN,
          y: PAGE_HEIGHT - 50 - 18,
          size: 9,
          font,
          color: rgb(0.45, 0.45, 0.4)
        });
      };
      drawHeader();
      y -= 46;

      const ensureSpace = (needed: number) => {
        if (y - needed < MARGIN) {
          pdfPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
          drawHeader();
          y -= 46;
          pdfPage.drawText('(continuação)', { x: MARGIN, y, size: 9, font: fontOblique, color: rgb(0.5, 0.5, 0.5) });
          y -= 22;
        }
      };

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
          if (!block.text?.trim()) continue;
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
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${script.title.replace(/[^a-z0-9]+/gi, '-')}.pdf"`
    }
  });
}
