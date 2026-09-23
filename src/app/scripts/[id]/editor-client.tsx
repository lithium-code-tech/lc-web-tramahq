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
  editionId: string;
  number: number;
  plotText: string;
  blocks: Block[];
}

interface CharacterData {
  id: string;
  name: string;
  description?: string;
}

interface PitchVersion {
  id: string;
  version: number;
  text: string;
  createdAt: string;
}

interface EditionData {
  id: string;
  number: number;
  subtitle?: string;
  text: string;
}

interface ScriptData {
  id: string;
  title: string;
  projectType: 'GRAPHIC_NOVEL' | 'SERIES';
  pages: PageData[];
  characters: CharacterData[];
  pitchDraft: string;
  pitchVersions: PitchVersion[];
  editions: EditionData[];
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function makePage(number: number, editionId: string): PageData {
  return {
    id: newId(),
    editionId,
    number,
    plotText: '',
    blocks: [{ id: newId(), type: 'QUADRO', number: 1, text: '' }]
  };
}

export default function EditorClient({
  initialScript,
  initialMode
}: {
  initialScript: ScriptData;
  initialMode?: 'FULL' | 'PLOT' | 'OUTLINE' | 'PITCH';
}) {
  const isSeries = initialScript.projectType === 'SERIES';
  const initialEditions = initialScript.editions.length
    ? initialScript.editions
    : [{ id: newId(), number: 1, subtitle: '', text: '' }];
  const [title, setTitle] = useState(initialScript.title);
  const [characters, setCharacters] = useState<CharacterData[]>(initialScript.characters);
  const [editions, setEditions] = useState<EditionData[]>(initialEditions);
  const [activeEditionId, setActiveEditionId] = useState(initialEditions[0].id);
  const [pages, setPages] = useState<PageData[]>(
    initialScript.pages.length ? initialScript.pages : [makePage(1, initialEditions[0].id)]
  );
  const [mode, setMode] = useState<'FULL' | 'PLOT' | 'OUTLINE' | 'PITCH'>(initialMode || 'FULL');
  const [selectedPage, setSelectedPage] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  const [pitchText, setPitchText] = useState(initialScript.pitchDraft);
  const [pitchVersions, setPitchVersions] = useState<PitchVersion[]>(initialScript.pitchVersions);
  const [pitchExpanded, setPitchExpanded] = useState<string | null>(null);
  const [pitchSaving, setPitchSaving] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [pitchError, setPitchError] = useState('');

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
  }, [focusId, pages, characters, editions]);

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
            editionNumber: editions.find((e) => e.id === p.editionId)?.number ?? 1,
            number: p.number,
            plotText: p.plotText,
            blocks: p.blocks.map((b) => ({ type: b.type, number: b.number, character: b.character, text: b.text }))
          })),
          characters: characters.map((c) => ({ name: c.name, description: c.description || '' })),
          editions: editions.map((e) => ({ number: e.number, subtitle: e.subtitle || '', text: e.text }))
        })
      });
      setSaving(false);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, pages, characters, editions]);

  // Autosave do rascunho da proposta (debounced, independente do resto)
  const pitchSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pitchIsFirstRun = useRef(true);
  useEffect(() => {
    if (pitchIsFirstRun.current) {
      pitchIsFirstRun.current = false;
      return;
    }
    setPitchSaving(true);
    if (pitchSaveTimer.current) clearTimeout(pitchSaveTimer.current);
    pitchSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/scripts/${initialScript.id}/pitch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pitchText })
      });
      setPitchSaving(false);
    }, 800);
    return () => {
      if (pitchSaveTimer.current) clearTimeout(pitchSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchText]);

  async function savePitchVersion() {
    setSavingVersion(true);
    setPitchError('');
    try {
      const res = await fetch(`/api/scripts/${initialScript.id}/pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pitchText })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPitchError(body?.error || 'Não foi possível salvar a versão.');
        return;
      }
      const created: PitchVersion = await res.json();
      setPitchVersions((prev) => [created, ...prev]);
    } catch {
      setPitchError('Não foi possível salvar a versão.');
    } finally {
      setSavingVersion(false);
    }
  }

  const pagesInEdition = useMemo(
    () => pages.filter((p) => p.editionId === activeEditionId).sort((a, b) => a.number - b.number),
    [pages, activeEditionId]
  );
  const activePage = pagesInEdition[selectedPage];

  function selectEdition(editionId: string) {
    setActiveEditionId(editionId);
    setSelectedPage(0);
  }

  function updatePageById(pageId: string, updater: (p: PageData) => PageData) {
    setPages((prev) => prev.map((p) => (p.id === pageId ? updater(p) : p)));
  }

  function updateBlockText(blockId: string, text: string) {
    if (!activePage) return;
    updatePageById(activePage.id, (p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, text } : b))
    }));
  }

  function updateBlockCharacter(blockId: string, character: string) {
    if (!activePage) return;
    updatePageById(activePage.id, (p) => ({
      ...p,
      blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, character } : b))
    }));
  }

  function cycleBlock(blockId: string, currentType: BlockType, isEmpty: boolean) {
    if (!activePage) return;
    const normalNext: BlockType = currentType === 'QUADRO' ? 'DIALOGO' : currentType === 'DIALOGO' ? 'ONOMATOPEIA' : 'QUADRO';
    const nextType: BlockType = isEmpty ? 'QUADRO' : normalNext;
    const id = newId();
    updatePageById(activePage.id, (p) => {
      const idx = p.blocks.findIndex((b) => b.id === blockId);
      const number = nextType === 'QUADRO' ? p.blocks.filter((b) => b.type === 'QUADRO').length + 1 : undefined;
      const newBlock: Block = { id, type: nextType, number, text: '', character: '' };
      const blocks = [...p.blocks.slice(0, idx + 1), newBlock, ...p.blocks.slice(idx + 1)];
      return { ...p, blocks };
    });
    setFocusId(nextType === 'DIALOGO' ? id + '-char' : id);
  }

  function skipEmptyDialogo(blockId: string) {
    if (!activePage) return;
    updatePageById(activePage.id, (p) => {
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
    const newPage = makePage(pagesInEdition.length + 1, activeEditionId);
    setPages((prev) => [...prev, newPage]);
    setSelectedPage(pagesInEdition.length);
  }

  function updatePlotText(index: number, text: string) {
    const page = pagesInEdition[index];
    if (!page) return;
    setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, plotText: text } : p)));
  }

  function advancePlot(index: number) {
    if (index === pagesInEdition.length - 1) {
      const np = makePage(pagesInEdition.length + 1, activeEditionId);
      setPages((prev) => [...prev, np]);
      setFocusId('plot-' + np.id);
    } else {
      setFocusId('plot-' + pagesInEdition[index + 1].id);
    }
  }

  function updateEditionText(index: number, text: string) {
    setEditions((prev) => prev.map((e, i) => (i === index ? { ...e, text } : e)));
  }

  function updateEditionSubtitle(index: number, subtitle: string) {
    setEditions((prev) => prev.map((e, i) => (i === index ? { ...e, subtitle } : e)));
  }

  function advanceEdition(index: number) {
    if (index === editions.length - 1) {
      const ne = { id: newId(), number: editions.length + 1, subtitle: '', text: '' };
      setEditions((prev) => [...prev, ne]);
      setFocusId('edition-' + ne.id + '-subtitle');
    } else {
      setFocusId('edition-' + editions[index + 1].id + '-subtitle');
    }
  }

  function setEditionCount(count: number) {
    const n = Math.max(1, Math.min(80, count || 1));
    setEditions((prev) => {
      if (n === prev.length) return prev;
      if (n < prev.length) return prev.slice(0, n);
      const extra = Array.from({ length: n - prev.length }, (_, i) => ({
        id: newId(),
        number: prev.length + i + 1,
        subtitle: '',
        text: ''
      }));
      return [...prev, ...extra];
    });
  }

  function addCharacter() {
    setCharacters((prev) => [...prev, { id: newId(), name: 'NOVO PERSONAGEM', description: '' }]);
  }

  function addCharacterFromPitch() {
    const id = newId();
    setCharacters((prev) => [...prev, { id, name: '', description: '' }]);
    setFocusId('pchar-' + id + '-name');
  }

  function updateCharacterField(id: string, field: 'name' | 'description', value: string) {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function advanceCharacterDescription(id: string) {
    const idx = characters.findIndex((c) => c.id === id);
    if (idx === characters.length - 1) {
      const newChar = { id: newId(), name: '', description: '' };
      setCharacters((prev) => [...prev, newChar]);
      setFocusId('pchar-' + newChar.id + '-name');
    } else {
      setFocusId('pchar-' + characters[idx + 1].id + '-name');
    }
  }

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

        {isSeries && (
          <div className="flex flex-wrap gap-1.5">
            {editions.map((ed) => (
              <button
                key={ed.id}
                onClick={() => selectEdition(ed.id)}
                title={ed.subtitle ? `Edição ${ed.number}: ${ed.subtitle}` : `Edição ${ed.number}`}
                className="border-[1.5px] px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: ed.id === activeEditionId ? '#2B4C7E' : '#4A453A',
                  background: ed.id === activeEditionId ? 'rgba(43,76,126,0.28)' : 'transparent',
                  color: ed.id === activeEditionId ? '#F2EDE1' : '#9A927E'
                }}
              >
                ED. {ed.number}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {pagesInEdition.map((p, i) => (
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
            {pagesInEdition.length} páginas {saving && '· salvando…'}
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Manuscrito */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-paper-line px-12 py-5">
          <div>
            <div className="font-display text-[25px] font-bold text-ink">
              {mode === 'FULL' ? (activePage ? `Página ${activePage.number}` : 'Edição vazia') : title}
            </div>
            <div className="text-xs text-[#8F8878]">
              {mode === 'FULL' ? 'Roteiro' : mode === 'PLOT' ? 'Plot — página a página' : mode === 'OUTLINE' ? 'Esboço da trama' : 'Proposta'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border-[1.5px] border-ink">
              <button
                onClick={() => setMode('FULL')}
                className="px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                style={{ background: mode === 'FULL' ? '#201E19' : '#FBF8F1', color: mode === 'FULL' ? '#F2EDE1' : '#201E19' }}
              >
                ROTEIRO
              </button>
              <button
                onClick={() => setMode('PLOT')}
                className="border-l-[1.5px] border-ink px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                style={{ background: mode === 'PLOT' ? '#201E19' : '#FBF8F1', color: mode === 'PLOT' ? '#F2EDE1' : '#201E19' }}
              >
                PLOT
              </button>
              {isSeries && (
                <button
                  onClick={() => setMode('OUTLINE')}
                  className="border-l-[1.5px] border-ink px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                  style={{ background: mode === 'OUTLINE' ? '#201E19' : '#FBF8F1', color: mode === 'OUTLINE' ? '#F2EDE1' : '#201E19' }}
                >
                  ESBOÇO DA TRAMA
                </button>
              )}
              {isSeries && (
                <button
                  onClick={() => setMode('PITCH')}
                  className="border-l-[1.5px] border-ink px-4 py-2 text-[12.5px] font-semibold tracking-wide"
                  style={{ background: mode === 'PITCH' ? '#201E19' : '#FBF8F1', color: mode === 'PITCH' ? '#F2EDE1' : '#201E19' }}
                >
                  PROPOSTA
                </button>
              )}
            </div>
            <a
              href={
                mode === 'PITCH'
                  ? `/api/scripts/${initialScript.id}/pitch/export`
                  : `/api/scripts/${initialScript.id}/export?mode=${mode === 'PLOT' ? 'plot' : mode === 'OUTLINE' ? 'outline' : 'full'}`
              }
              className={
                'border-[1.5px] border-ink bg-ink px-4 py-2 text-[12.5px] font-semibold text-[#F2EDE1]' +
                (mode === 'PITCH' && pitchVersions.length === 0 ? ' pointer-events-none opacity-40' : '')
              }
            >
              Exportar PDF
            </a>
          </div>
        </div>

        <div className="flex max-w-[760px] flex-1 flex-col gap-5 overflow-y-auto px-12 pb-24 pt-10">
          {mode === 'PITCH' && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-[#9A927E]">PERSONAGENS</div>
                <div className="flex flex-col gap-2">
                  {characters.map((c) => (
                    <div key={c.id} className="border-[1.5px] border-ink bg-white p-3">
                      <input
                        ref={(el) => {
                          fieldRefs.current['pchar-' + c.id + '-name'] = el;
                        }}
                        value={c.name}
                        placeholder="NOME DO PERSONAGEM"
                        onChange={(e) => updateCharacterField(c.id, 'name', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setFocusId('pchar-' + c.id + '-desc');
                          }
                        }}
                        className="w-full bg-transparent font-display text-sm font-bold uppercase tracking-wide text-ink outline-none"
                      />
                      <textarea
                        ref={(el) => {
                          fieldRefs.current['pchar-' + c.id + '-desc'] = el;
                        }}
                        rows={2}
                        value={c.description || ''}
                        placeholder="Quem é, o que quer, papel na história…"
                        onChange={(e) => updateCharacterField(c.id, 'description', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            advanceCharacterDescription(c.id);
                          }
                        }}
                        className="mt-1 w-full resize-y bg-transparent font-script text-sm leading-relaxed text-ink outline-none"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={addCharacterFromPitch}
                  className="mt-2 w-full border border-dashed border-[#D8CFB8] py-2 text-center text-xs font-semibold text-[#9A927E]"
                >
                  + Personagem
                </button>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-[#9A927E]">PROPOSTA ESCRITA</div>
                <textarea
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value)}
                  placeholder="Conceito, missão da história, o que está em jogo…"
                  rows={14}
                  className="w-full resize-y border-[1.5px] border-ink bg-white p-4 font-script text-sm leading-relaxed text-ink outline-none focus:outline-accent-blue"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11.5px] text-[#9A927E]">{pitchSaving ? 'salvando rascunho…' : 'rascunho salvo'}</div>
                <div className="flex items-center gap-3">
                  {pitchError && <span className="text-[11.5px] text-accent-red">{pitchError}</span>}
                  <button
                    onClick={savePitchVersion}
                    disabled={savingVersion || !pitchText.trim()}
                    className="bg-ink px-4 py-2 text-[12.5px] font-semibold text-[#F2EDE1] disabled:opacity-50"
                  >
                    {savingVersion ? 'Salvando…' : 'Salvar versão'}
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-[#9A927E]">HISTÓRICO DE VERSÕES</div>
                {pitchVersions.length === 0 && (
                  <div className="border-[1.5px] border-dashed border-[#D8CFB8] p-4 text-[12px] text-[#9A927E]">
                    Nenhuma versão salva ainda.
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {pitchVersions.map((v) => {
                    const isOpen = pitchExpanded === v.id;
                    return (
                      <div key={v.id} className="border-[1.5px] border-paper-line">
                        <button
                          onClick={() => setPitchExpanded(isOpen ? null : v.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left"
                        >
                          <span className="font-display text-sm font-bold text-ink">v{v.version}</span>
                          <span className="text-[11px] text-[#8F8878]">
                            {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="whitespace-pre-wrap border-t border-paper-line px-3 py-2 font-script text-xs leading-relaxed text-ink">
                            {v.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {mode === 'FULL' && !activePage && (
            <div className="pl-[18px] text-sm text-[#9A927E]">
              Esta edição ainda não tem páginas. Use "+ Página" na lateral pra começar.
            </div>
          )}

          {mode === 'FULL' &&
            activePage &&
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

          {mode === 'FULL' && activePage && (
            <div className="pl-[18px] text-[11.5px] text-[#9A927E]">
              Enter alterna quadro → personagem → fala → onomatopeia. Enter vazio pula direto pro próximo quadro. Shift+Enter
              quebra linha.
            </div>
          )}

          {mode === 'PLOT' && pagesInEdition.length === 0 && (
            <div className="text-sm text-[#9A927E]">Esta edição ainda não tem páginas. Use "+ Página" na lateral pra começar.</div>
          )}

          {mode === 'PLOT' &&
            pagesInEdition.map((p, i) => (
              <div key={p.id} className="flex items-start gap-4 border-b border-paper-line pb-4">
                <div className="w-[34px] flex-shrink-0 pt-0.5 font-display text-[15px] font-bold text-[#2B4C7E]">{p.number}</div>
                <textarea
                  ref={(el) => {
                    fieldRefs.current['plot-' + p.id] = el;
                  }}
                  rows={5}
                  value={p.plotText}
                  placeholder="O que acontece nesta página…"
                  onChange={(e) => updatePlotText(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      advancePlot(i);
                    }
                  }}
                  className="flex-1 resize-y bg-transparent text-left font-script text-sm italic leading-relaxed text-ink outline-none"
                />
              </div>
            ))}
          {mode === 'PLOT' && (
            <div className="text-[11.5px] text-[#9A927E]">Enter pula para a próxima página. Plot é página a página.</div>
          )}

          {mode === 'OUTLINE' && (
            <div className="mb-2 flex items-center gap-3">
              <label className="text-[11px] font-semibold tracking-wide text-[#9A927E]">QUANTIDADE DE EDIÇÕES</label>
              <input
                type="number"
                min={1}
                max={80}
                value={editions.length}
                onChange={(e) => setEditionCount(Number(e.target.value))}
                className="w-16 border-[1.5px] border-ink bg-white px-2 py-1 text-center font-script text-sm outline-none focus:outline-accent-blue"
              />
            </div>
          )}

          {mode === 'OUTLINE' &&
            editions.map((e, i) => (
              <div key={e.id} className="border-l-[3px] border-[#2B4C7E] py-1 pl-[18px]">
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-[10.5px] font-bold tracking-wider text-[#2B4C7E]">
                    EDIÇÃO {e.number}
                  </span>
                  <input
                    ref={(el) => {
                      fieldRefs.current['edition-' + e.id + '-subtitle'] = el;
                    }}
                    value={e.subtitle || ''}
                    placeholder="Subtítulo desta edição…"
                    onChange={(ev) => updateEditionSubtitle(i, ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault();
                        setFocusId('edition-' + e.id + '-text');
                      }
                    }}
                    className="flex-1 bg-transparent font-display text-[13px] font-semibold text-ink outline-none"
                  />
                </div>
                <textarea
                  ref={(el) => {
                    fieldRefs.current['edition-' + e.id + '-text'] = el;
                  }}
                  rows={6}
                  value={e.text}
                  placeholder="O que acontece nesta edição…"
                  onChange={(ev) => updateEditionText(i, ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      advanceEdition(i);
                    }
                  }}
                  className="w-full resize-y bg-transparent font-script text-sm italic leading-relaxed text-ink outline-none"
                />
              </div>
            ))}
          {mode === 'OUTLINE' && (
            <div className="pl-[18px] text-[11.5px] text-[#9A927E]">
              Enter avança pra próxima edição (cria uma nova se for a última). Shift+Enter quebra linha.
            </div>
          )}
        </div>
      </div>

      {/* Personagens */}
      <div className="w-[248px] flex-shrink-0 bg-sidebar p-5 text-[#F2EDE1]">
        {mode === 'FULL' && activePage && (
          <div className="mb-5 border-[1.5px] border-[#4A453A] bg-[#26231D] p-3.5">
            <div className="mb-1.5 text-[10px] font-bold tracking-wider text-[#9A927E]">
              PLOT · PÁGINA {activePage.number}
            </div>
            <div className="whitespace-pre-wrap font-script text-[12.5px] italic leading-relaxed text-[#E5DFD0]">
              {activePage.plotText?.trim() || 'Sem anotação de plot para esta página.'}
            </div>
          </div>
        )}
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
