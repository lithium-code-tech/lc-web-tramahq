// Compacta uma imagem no navegador antes do upload: reduz o lado maior e
// converte para WebP (cai para JPEG se o navegador não gerar WebP).
// Uma foto de 3–5 MB vira ~150–300 KB, que é o que vai para o banco.

export const FULL_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 320;

interface Compressed {
  blob: Blob;
  width: number;
  height: number;
}

async function encode(source: ImageBitmap, maxSide: number, quality: number): Promise<Compressed> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let blob = await toBlob('image/webp');
  // Navegadores sem encoder WebP devolvem PNG no lugar — aí vale mais o JPEG.
  if (!blob || blob.type !== 'image/webp') {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    blob = await toBlob('image/jpeg');
  }
  if (!blob) throw new Error('Não foi possível compactar a imagem.');
  return { blob, width, height };
}

export async function compressImage(file: Blob) {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo não é uma imagem.');
  const bitmap = await createImageBitmap(file);
  try {
    const full = await encode(bitmap, FULL_MAX_SIDE, 0.82);
    const thumb = await encode(bitmap, THUMB_MAX_SIDE, 0.7);
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}
