// Campos de uma referência que vão para o cliente — nunca os bytes da imagem,
// que são servidos à parte por /api/references/[refId].
export const REFERENCE_SELECT = {
  id: true,
  caption: true,
  characterName: true,
  editionNumber: true,
  pageNumber: true,
  width: true,
  height: true,
  createdAt: true
} as const;

export interface ReferenceItem {
  id: string;
  caption: string;
  characterName: string | null;
  editionNumber: number | null;
  pageNumber: number | null;
  width: number;
  height: number;
  createdAt: string;
}

// A que a referência está ligada. Página exige edição + número.
export type ReferenceLink =
  | { kind: 'project' }
  | { kind: 'character'; name: string }
  | { kind: 'page'; editionNumber: number; pageNumber: number };

export function linkOf(ref: Pick<ReferenceItem, 'characterName' | 'editionNumber' | 'pageNumber'>): ReferenceLink {
  if (ref.characterName) return { kind: 'character', name: ref.characterName };
  if (ref.editionNumber !== null && ref.pageNumber !== null) {
    return { kind: 'page', editionNumber: ref.editionNumber, pageNumber: ref.pageNumber };
  }
  return { kind: 'project' };
}

export function linkFields(link: ReferenceLink) {
  return {
    characterName: link.kind === 'character' ? link.name : null,
    editionNumber: link.kind === 'page' ? link.editionNumber : null,
    pageNumber: link.kind === 'page' ? link.pageNumber : null
  };
}

export function referenceImageUrl(id: string, thumb = false) {
  return `/api/references/${id}${thumb ? '?thumb=1' : ''}`;
}
