import { Color, PDFFont, PDFPage } from 'pdf-lib';

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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

export function drawCentered(
  pdfPage: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  pageWidth: number,
  color?: Color
) {
  const width = font.widthOfTextAtSize(text, size);
  pdfPage.drawText(text, { x: (pageWidth - width) / 2, y, size, font, color });
}
