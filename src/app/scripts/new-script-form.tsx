'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ProjectType = 'GRAPHIC_NOVEL' | 'SERIES';

export default function NewScriptForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pageCount, setPageCount] = useState('6');
  const [projectType, setProjectType] = useState<ProjectType>('SERIES');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, pageCount: Number(pageCount), projectType })
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || 'Não foi possível criar o roteiro. Tente novamente.');
        return;
      }

      const script = await res.json();
      if (script?.id) router.push(`/scripts/${script.id}`);
    } catch {
      setError('Não foi possível criar o roteiro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 border-[1.5px] border-ink bg-white p-6">
      <div className="font-display text-lg font-bold text-ink">Nova história</div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold tracking-wide text-[#55503F]">TIPO DE PROJETO</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProjectType('GRAPHIC_NOVEL')}
            className="flex-1 border-[1.5px] px-3 py-2 text-left text-xs"
            style={{
              borderColor: '#201E19',
              background: projectType === 'GRAPHIC_NOVEL' ? '#201E19' : '#FBF8F1',
              color: projectType === 'GRAPHIC_NOVEL' ? '#F2EDE1' : '#201E19'
            }}
          >
            <div className="font-display font-bold">Graphic Novel</div>
            <div className="opacity-70">Single issue — Roteiro e Plot</div>
          </button>
          <button
            type="button"
            onClick={() => setProjectType('SERIES')}
            className="flex-1 border-[1.5px] px-3 py-2 text-left text-xs"
            style={{
              borderColor: '#201E19',
              background: projectType === 'SERIES' ? '#201E19' : '#FBF8F1',
              color: projectType === 'SERIES' ? '#F2EDE1' : '#201E19'
            }}
          >
            <div className="font-display font-bold">Série</div>
            <div className="opacity-70">Proposta, Plot, Esboço da Trama e Roteiro</div>
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold tracking-wide text-[#55503F]">NOME DA HISTÓRIA</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Diesel"
          className="w-full border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 font-script text-sm outline-none focus:outline-accent-blue"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold tracking-wide text-[#55503F]">NÚMERO DE PÁGINAS</label>
        <input
          type="number"
          min={1}
          max={80}
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          className="w-28 border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 font-script text-sm outline-none focus:outline-accent-blue"
        />
      </div>
      {error && <div className="text-sm text-accent-red">{error}</div>}
      <button disabled={loading} type="submit" className="bg-ink py-3 text-sm font-bold text-[#F2EDE1] disabled:opacity-50">
        {loading ? 'Criando…' : 'COMEÇAR ROTEIRO'}
      </button>
    </form>
  );
}
