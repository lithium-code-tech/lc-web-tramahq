'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewScriptForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [pageCount, setPageCount] = useState('6');
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
        body: JSON.stringify({ title, pageCount: Number(pageCount) })
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
