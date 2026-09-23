'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import LogoutButton from '@/components/logout-button';

type BlockType = 'QUADRO' | 'DIALOGO' | 'ONOMATOPEIA';

interface Block {
  id: string;
  type: BlockType;
  number?: number;
  character?: string;
  text: string;
}

interface PageData {
  id: string;
  number: number;
  plotText: string;
  blocks: Block[];
}

interface CharacterData {
  id: string;
  name: string;
}

interface ScriptData {
  id: string;
  title: string;
  pages: PageData[];
  characters: CharacterData[];
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function makePage(number: number): PageData {
  return { id: newId(), number, plotText: '', blocks: [{ id: newId(), type: 'QUADRO', number: 1, text: '' }] };
}

export default function EditorClient({ initialScript }: { initialScript: ScriptData }) {
  const [title, setTitle] = useState(initialScript.title);
  const [pages, setPages] = useState<PageData[]>(initialScript.pages.length ? initialScript.pages : [makePage(1)]);
  const [characters, setCharacters] = useState<CharacterData[]>(initialScript.characters);
  const [mode, setMode] = useState<'FULL' | 'PLOT'>('FULL');
  const [selectedPage, setSelectedPage] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  useEffect(() => {
    if (focusId && fieldRefs.current[focusId]) {
      const el = fieldRefs.current[focusId]!;
      el.focus();
      try {
        const len = el.value.length;
        (el as HTMLInputElement).setSelectionRange(len, len);
      } catch {
        // campos sem seleção de texto (ex.: alguns inputs) — ignora
      }
      setFocusId(null);
    }
  }, [focusId, pages]);

  // Autosave (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/scripts/${initialScript.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          pages: pages.map((p) => ({
            number: p.number,
            plotText: p.plotText,
            blocks: p.blocks.map((b) => ({ type: b.type, number: b.number, character: b.character, text: b.text }))
          })),
          characters: characters.map((c) => ({ name: c.name }))
        })
      });
      setSaving(false);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, pages, characters]);

  const activePage = pages[selectedPage];

  function updatePage(index: number, updater: (p: PageData) => PageData) {
    setPages((prev) => prev.map((p, i) => (i === index ? updater(p) : p)));
  }

  function updateBlockText(blockId: string, text: string) {
    updatePage(selectedPage, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, text } : b)) }));
  }

  function updateBlockCharacter(blockId: string, character: string) {
    updatePage(selectedPage, (p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, character } : b))
    }));
  }

  function cycleBlock(blockId: string, currentType: BlockType, isEmpty: boolean) {
    const normalNext: BlockType = currentType === 'QUADRO' ? 'DIALOGO' : currentType === 'DIALOGO' ? 'ONOMATOPEIA' : 'QUADRO';
    const nextType: BlockType = isEmpty ? 'QUADRO' : normalNext;
    const id = newId();
    updatePage(selectedPage, (p) => {
      const idx = p.blocks.findIndex((b) => b.id === blockId);
      const number = nextType === 'QUADRO' ? p.blocks.filter((b) => b.type === 'QUADRO').length + 1 : undefined;
      const newBlock: Block = { id, type: nextType, number, text: '', character: '' };
      const blocks = [...p.blocks.slice(0, idx + 1), newBlock, ...p.blocks.slice(idx + 1)];
      return { ...p, blocks };
    });
    setFocusId(nextType === 'DIALOGO' ? id + '-char' : id);
  }

  function skipEmptyDialogo(blockId: string) {
    updatePage(selectedPage, (p) => {
      const idx = p.blocks.findIndex((b) => b.id === blockId);
      const number = p.blocks.filter((b) => b.type === 'QUADRO').length + 1;
      const blocks = p.blocks.map((b, i) =>
        i === idx ? { id: b.id, type: 'QUADRO' as BlockType, number, text: '', character: '' } : b
      );
      return { ...p, blocks };
    });
    setFocusId(blockId);
  }

  function addPage() {
    setPages((prev) => [...prev, makePage(prev.length + 1)]);
    setSelectedPage(pages.length);
  }

  function updatePlotText(index: number, text: string) {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, plotText: text } : p)));
  }

  function advancePlot(index: number) {
    if (index === pages.length - 1) {
      const np = makePage(pages.length + 1);
      setPages((prev) => [...prev, np]);
      setFocusId('plot-' + np.id);
    } else {
      setFocusId('plot-' + pages[index + 1].id);
    }
  }

  function addCharacter() {
    setCharacters((prev) => [...prev, { id: newId(), name: 'NOVO PERSONAGEM' }]);
  }

  const totalQuadros = useMemo(
    () => pages.reduce((sum, p) => sum + p.blocks.filter((b) => b.type === 'QUADRO').length, 0),
    [pages]
  );

  return (
    <div className="flex min-h-screen w-full bg-paper">
      {/* Sidebar de páginas */}
      <div className="flex w-[232px] flex-shrink-0 flex-col gap-7 bg-sidebar p-5 text-[#F2EDE1]">
        <div>
          <Link href="/scripts" className="mb-2 block text-[11.5px] font-semibold text-[#B7AF9A] hover:text-[#F2EDE1]">
            ← Meus roteiros
          </Link>
          <div className="font-display text-xl font-bold">TramaHQ</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full bg-transparent text-xs text-[#9A927E] outline-none"
          />
        </div>

        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedPage(i)}
              className="flex items-center justify-between border-l-[3px] px-3 py-2.5 text-left"
              style={{
                borderColor: i === selectedPage ? '#2B4C7E' : 'transparent',
                background: i === selectedPage ? 'rgba(43,76,126,0.22)' : 'transparent'
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-sm font-semibold text-[#F2EDE1]">Página {p.number}</span>
                <span className="text-[11.5px] text-[#9A927E]">
                  {p.blocks.filter((b) => b.type === 'QUADRO').length} quadros
                </span>
              </div>
            </button>
          ))}
          <button
            onClick={addPage}
            className="mt-2 border border-dashed border-[#4A453A] px-3 py-2.5 text-center text-xs font-semibold text-[#B7AF9A]"
          >
            + Página
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-[#3A362E] pt-4 text-[11.5px] text-[#6F6A5B]">
          <div>
            {pages.length} páginas · {totalQuadros} quadros {saving && '· salvando…'}
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Manuscrito */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-paper-line px-12 py-5">
          <div>
            <div className="font-display text-[25px] font-bold text-ink">
              {mode === 'FULL' ? `Página ${activePage.number}` : title}
            </div>
            <div className="text-xs text-[#8F8878]">
              {mode === 'FULL' ? 'Full Script — quadro a quadro' : 'Plot — página a página'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border-[1.5px] border-ink">
              <button
                onClick={() => setMode('FULL')}
                className="px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                style={{ background: mode === 'FULL' ? '#201E19' : '#FBF8F1', color: mode === 'FULL' ? '#F2EDE1' : '#201E19' }}
              >
                FULL SCRIPT
              </button>
              <button
                onClick={() => setMode('PLOT')}
                className="border-l-[1.5px] border-ink px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                style={{ background: mode === 'PLOT' ? '#201E19' : '#FBF8F1', color: mode === 'PLOT' ? '#F2EDE1' : '#201E19' }}
              >
                PLOT
              </button>
            </div>
            <a
              href={`/api/scripts/${initialScript.id}/export?mode=${mode === 'PLOT' ? 'plot' : 'full'}`}
              className="border-[1.5px] border-ink bg-ink px-4 py-2 text-[12.5px] font-semibold text-[#F2EDE1]"
            >
              Exportar PDF
            </a>
          </div>
        </div>

        <div className="flex max-w-[760px] flex-1 flex-col gap-5 overflow-y-auto px-12 pb-24 pt-10">
          {mode === 'FULL' &&
            activePage.blocks.map((b) => {
              if (b.type === 'DIALOGO') {
                return (
                  <div key={b.id} className="flex flex-col gap-1 border-l-[3px] border-[#D8CFB8] py-1 pl-[18px]">
                    <div className="text-[10.5px] font-bold tracking-wider text-[#8F8878]">DIÁLOGO</div>
                    <input
                      ref={(el) => {
                        fieldRefs.current[b.id + '-char'] = el;
                      }}
                      value={b.character || ''}
                      placeholder="PERSONAGEM"
                      onChange={(e) => updateBlockCharacter(b.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (e.currentTarget.value.trim() === '') skipEmptyDialogo(b.id);
                          else setFocusId(b.id);
                        }
                      }}
                      className="w-full bg-transparent text-center font-script text-[13px] font-bold uppercase tracking-wide text-ink outline-none"
                    />
                    <textarea
                      ref={(el) => {
                        fieldRefs.current[b.id] = el;
                      }}
                      rows={2}
                      value={b.text}
                      placeholder="A fala…"
                      onChange={(e) => updateBlockText(b.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          cycleBlock(b.id, b.type, e.currentTarget.value.trim() === '');
                        }
                      }}
                      className="w-full resize-y bg-transparent text-center font-script text-sm leading-relaxed text-ink outline-none"
                    />
                  </div>
                );
              }

              const isOnomatopeia = b.type === 'ONOMATOPEIA';
              return (
                <div key={b.id} className="border-l-[3px] py-1 pl-[18px]" style={{ borderColor: isOnomatopeia ? '#A23B2E' : '#2B4C7E' }}>
                  <div
                    className="mb-1.5 text-[10.5px] font-bold tracking-wider"
                    style={{ color: isOnomatopeia ? '#A23B2E' : '#2B4C7E' }}
                  >
                    {b.type === 'QUADRO' ? `QUADRO ${b.number}` : 'ONOMATOPEIA'}
                  </div>
                  <textarea
                    ref={(el) => {
                      fieldRefs.current[b.id] = el;
                    }}
                    rows={b.type === 'ONOMATOPEIA' ? 1 : 2}
                    value={b.text}
                    placeholder={b.type === 'QUADRO' ? 'Descreva a cena deste quadro…' : 'BOOM'}
                    onChange={(e) => updateBlockText(b.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        cycleBlock(b.id, b.type, e.currentTarget.value.trim() === '');
                      }
                    }}
                    className="w-full resize-y bg-transparent font-script text-sm leading-relaxed text-ink outline-none"
                    style={{
                      fontStyle: b.type === 'QUADRO' ? 'italic' : 'normal',
                      fontWeight: isOnomatopeia ? 700 : 400,
                      textTransform: isOnomatopeia ? 'uppercase' : 'none'
                    }}
                  />
                </div>
              );
            })}

          {mode === 'FULL' && (
            <div className="pl-[18px] text-[11.5px] text-[#9A927E]">
              Enter alterna quadro → personagem → fala → onomatopeia. Enter vazio pula direto pro próximo quadro. Shift+Enter
              quebra linha.
            </div>
          )}

          {mode === 'PLOT' &&
            pages.map((p, i) => (
              <div key={p.id} className="flex items-start gap-4 border-b border-paper-line pb-4">
                <div className="w-[34px] flex-shrink-0 pt-0.5 font-display text-[15px] font-bold text-[#2B4C7E]">{p.number}</div>
                <textarea
                  ref={(el) => {
                    fieldRefs.current['plot-' + p.id] = el;
                  }}
                  rows={2}
                  value={p.plotText}
                  placeholder="O que acontece nesta página…"
                  onChange={(e) => updatePlotText(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      advancePlot(i);
                    }
                  }}
                  className="flex-1 resize-y bg-transparent text-center font-script text-sm italic leading-relaxed text-ink outline-none"
                />
              </div>
            ))}
          {mode === 'PLOT' && (
            <div className="text-[11.5px] text-[#9A927E]">Enter pula para a próxima página. Plot é página a página.</div>
          )}
        </div>
      </div>

      {/* Personagens */}
      <div className="w-[248px] flex-shrink-0 bg-sidebar p-5 text-[#F2EDE1]">
        <div className="mb-4 font-display text-sm font-bold tracking-wide">PERSONAGENS</div>
        {characters.map((c) => (
          <div key={c.id} className="border-b border-[#3A362E] py-2.5 text-[13px] text-[#E5DFD0]">
            {c.name}
          </div>
        ))}
        <button
          onClick={addCharacter}
          className="mt-4 w-full border border-dashed border-[#4A453A] py-2 text-center text-xs font-semibold text-[#B7AF9A]"
        >
          + Personagem
        </button>
      </div>
    </div>
  );
}
