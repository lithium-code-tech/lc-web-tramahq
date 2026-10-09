'use client';

import { useEffect, useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import { linkFields, linkOf, referenceImageUrl, type ReferenceItem, type ReferenceLink } from '@/lib/references';

export interface PageOption {
  editionNumber: number;
  pageNumber: number;
}

export async function uploadReference(scriptId: string, file: Blob, link: ReferenceLink): Promise<ReferenceItem> {
  const { full, thumb } = await compressImage(file);
  const form = new FormData();
  form.append('image', full.blob);
  form.append('thumb', thumb.blob);
  form.append('width', String(full.width));
  form.append('height', String(full.height));
  const fields = linkFields(link);
  if (fields.characterName) form.append('characterName', fields.characterName);
  if (fields.editionNumber !== null) form.append('editionNumber', String(fields.editionNumber));
  if (fields.pageNumber !== null) form.append('pageNumber', String(fields.pageNumber));

  const res = await fetch(`/api/scripts/${scriptId}/references`, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Não foi possível enviar a imagem.');
  }
  return res.json();
}

// Imagens que vieram do clipboard ou de um drop — ignora o que não for imagem.
export function imageFilesFrom(list: FileList | DataTransferItemList | null | undefined): File[] {
  if (!list) return [];
  const files: File[] = [];
  for (const item of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const file = item instanceof File ? item : item.kind === 'file' ? item.getAsFile() : null;
    if (file && file.type.startsWith('image/')) files.push(file);
  }
  return files;
}

// <select> precisa de string: 'project' | 'c:Nome' | 'p:edição:página'
function encodeLink(link: ReferenceLink) {
  if (link.kind === 'character') return 'c:' + link.name;
  if (link.kind === 'page') return `p:${link.editionNumber}:${link.pageNumber}`;
  return 'project';
}

function decodeLink(value: string): ReferenceLink {
  if (value.startsWith('c:')) return { kind: 'character', name: value.slice(2) };
  if (value.startsWith('p:')) {
    const [, ed, pg] = value.split(':');
    return { kind: 'page', editionNumber: Number(ed), pageNumber: Number(pg) };
  }
  return { kind: 'project' };
}

export function pageLabel(editionNumber: number, pageNumber: number, isSeries: boolean) {
  return isSeries ? `Ed. ${editionNumber} · Página ${pageNumber}` : `Página ${pageNumber}`;
}

export function linkLabel(link: ReferenceLink, isSeries: boolean) {
  if (link.kind === 'character') return link.name;
  if (link.kind === 'page') return pageLabel(link.editionNumber, link.pageNumber, isSeries);
  return 'Projeto';
}

function LinkSelect({
  value,
  onChange,
  characterNames,
  pageOptions,
  isSeries,
  className
}: {
  value: ReferenceLink;
  onChange: (link: ReferenceLink) => void;
  characterNames: string[];
  pageOptions: PageOption[];
  isSeries: boolean;
  className?: string;
}) {
  const encoded = encodeLink(value);
  // Personagem renomeado/removido ou página de edição apagada: mantém a opção
  // atual visível em vez de trocar a ligação por baixo dos panos.
  const known =
    encoded === 'project' ||
    characterNames.some((n) => 'c:' + n === encoded) ||
    pageOptions.some((p) => `p:${p.editionNumber}:${p.pageNumber}` === encoded);

  return (
    <select value={encoded} onChange={(e) => onChange(decodeLink(e.target.value))} className={className}>
      <option value="project">Projeto (geral)</option>
      {!known && <option value={encoded}>{linkLabel(value, isSeries)} (não existe mais)</option>}
      {characterNames.length > 0 && (
        <optgroup label="Personagens">
          {characterNames.map((n) => (
            <option key={n} value={'c:' + n}>
              {n}
            </option>
          ))}
        </optgroup>
      )}
      {pageOptions.length > 0 && (
        <optgroup label="Páginas">
          {pageOptions.map((p) => (
            <option key={`${p.editionNumber}:${p.pageNumber}`} value={`p:${p.editionNumber}:${p.pageNumber}`}>
              {pageLabel(p.editionNumber, p.pageNumber, isSeries)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

type Filter = 'ALL' | 'project' | 'character' | 'page';

export function ReferencesGallery({
  refs,
  characterNames,
  pageOptions,
  isSeries,
  uploading,
  error,
  onUpload,
  onUpdate,
  onDelete,
  onOpen
}: {
  refs: ReferenceItem[];
  characterNames: string[];
  pageOptions: PageOption[];
  isSeries: boolean;
  uploading: number;
  error: string;
  onUpload: (files: File[], link: ReferenceLink) => void;
  onUpdate: (id: string, patch: { caption?: string; link?: ReferenceLink }) => void;
  onDelete: (ref: ReferenceItem) => void;
  onOpen: (list: ReferenceItem[], index: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [target, setTarget] = useState<ReferenceLink>({ kind: 'project' });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Ctrl+V com imagem no clipboard envia direto, ligada ao destino escolhido.
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = imageFilesFrom(e.clipboardData?.items);
      if (!files.length) return;
      e.preventDefault();
      onUpload(files, targetRef.current);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onUpload]);

  const counts = {
    ALL: refs.length,
    project: refs.filter((r) => linkOf(r).kind === 'project').length,
    character: refs.filter((r) => linkOf(r).kind === 'character').length,
    page: refs.filter((r) => linkOf(r).kind === 'page').length
  };
  const visible = filter === 'ALL' ? refs : refs.filter((r) => linkOf(r).kind === filter);
  const filters: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'TODAS' },
    { key: 'project', label: 'PROJETO' },
    { key: 'character', label: 'PERSONAGENS' },
    { key: 'page', label: 'PÁGINAS' }
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = imageFilesFrom(e.dataTransfer.files);
          if (files.length) onUpload(files, target);
        }}
        className="flex flex-col items-center gap-3 border-[1.5px] border-dashed px-6 py-7 text-center"
        style={{ borderColor: dragging ? '#2B4C7E' : '#D8CFB8', background: dragging ? '#E9E3D3' : 'transparent' }}
      >
        <div className="text-sm text-ink">
          Arraste imagens aqui, cole com <b>Ctrl+V</b> ou{' '}
          <button onClick={() => fileInput.current?.click()} className="font-semibold text-accent-blue underline">
            escolha arquivos
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          <span className="font-semibold tracking-wide">LIGAR A</span>
          <LinkSelect
            value={target}
            onChange={setTarget}
            characterNames={characterNames}
            pageOptions={pageOptions}
            isSeries={isSeries}
            className="border-[1.5px] border-ink bg-white px-2 py-1 text-[12px] text-ink outline-none"
          />
        </div>
        <div className="text-[11px] text-muted">
          {uploading > 0
            ? `Compactando e enviando ${uploading} ${uploading === 1 ? 'imagem' : 'imagens'}…`
            : 'As imagens são reduzidas para no máximo 1600 px e salvas em WebP.'}
        </div>
        {error && <div className="text-[11.5px] text-accent-red">{error}</div>}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = imageFilesFrom(e.target.files);
            if (files.length) onUpload(files, target);
            e.target.value = '';
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="border-[1.5px] px-2.5 py-1 text-[11px] font-semibold tracking-wide"
            style={{
              borderColor: filter === f.key ? '#201E19' : '#D8CFB8',
              background: filter === f.key ? '#201E19' : 'transparent',
              color: filter === f.key ? '#F2EDE1' : '#6B6454'
            }}
          >
            {f.label} · {counts[f.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-paper-line p-4 text-[12px] text-muted">
          {refs.length === 0 ? 'Nenhuma referência ainda.' : 'Nenhuma referência neste filtro.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visible.map((r, i) => (
            <div key={r.id} className="group flex flex-col border-[1.5px] border-ink bg-white">
              <button
                onClick={() => onOpen(visible, i)}
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#26231D]"
                title="Abrir"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referenceImageUrl(r.id, true)} alt={r.caption} loading="lazy" className="max-h-full max-w-full object-contain" />
              </button>
              <div className="flex flex-col gap-1.5 p-2">
                <input
                  defaultValue={r.caption}
                  placeholder="Legenda…"
                  onBlur={(e) => {
                    if (e.target.value.trim() !== r.caption) onUpdate(r.id, { caption: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-full bg-transparent font-script text-[12.5px] text-ink outline-none"
                />
                <div className="flex items-center gap-1">
                  <LinkSelect
                    value={linkOf(r)}
                    onChange={(link) => onUpdate(r.id, { link })}
                    characterNames={characterNames}
                    pageOptions={pageOptions}
                    isSeries={isSeries}
                    className="min-w-0 flex-1 bg-transparent text-[11px] text-muted outline-none"
                  />
                  <button
                    onClick={() => onDelete(r)}
                    title="Excluir referência"
                    aria-label="Excluir referência"
                    className="px-1 text-sm leading-none text-muted opacity-0 transition-opacity hover:text-accent-red group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Miniaturas na coluna escura da direita (página ativa, personagem aberto).
export function ReferenceStrip({
  refs,
  onOpen,
  onAdd,
  empty
}: {
  refs: ReferenceItem[];
  onOpen: (index: number) => void;
  onAdd: (files: File[]) => void;
  empty: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      {refs.length === 0 ? (
        <div className="text-[11.5px] italic text-[#9A927E]">{empty}</div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {refs.map((r, i) => (
            <button
              key={r.id}
              onClick={() => onOpen(i)}
              title={r.caption || 'Abrir'}
              className="flex aspect-square items-center justify-center overflow-hidden border border-[#4A453A] bg-[#1E1C18] hover:border-[#F2EDE1]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImageUrl(r.id, true)} alt={r.caption} loading="lazy" className="max-h-full max-w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => fileInput.current?.click()}
        className="mt-2 w-full border border-dashed border-[#4A453A] py-1.5 text-center text-[11px] font-semibold text-[#B7AF9A] hover:text-[#F2EDE1]"
      >
        + Imagem
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = imageFilesFrom(e.target.files);
          if (files.length) onAdd(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function ReferenceLightbox({
  list,
  index,
  isSeries,
  onNavigate,
  onClose
}: {
  list: ReferenceItem[];
  index: number;
  isSeries: boolean;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  const ref = list[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < list.length - 1) onNavigate(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, list.length, onNavigate, onClose]);

  if (!ref) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={referenceImageUrl(ref.id)}
        alt={ref.caption}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[82vh] max-w-full object-contain"
      />
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-0.5 text-center text-[#F2EDE1]">
        {ref.caption && <div className="font-script text-sm">{ref.caption}</div>}
        <div className="text-[11px] text-[#9A927E]">
          {linkLabel(linkOf(ref), isSeries)} · {index + 1}/{list.length} · ← → navegam · Esc fecha
        </div>
      </div>
    </div>
  );
}
