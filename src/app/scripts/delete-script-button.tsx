'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function DeleteScriptButton({
  scriptId,
  title,
  className
}: {
  scriptId: string;
  title: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/scripts/${scriptId}`, { method: 'DELETE' });
      router.refresh();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className || 'text-[11px] font-semibold text-accent-red disabled:opacity-50'}
      >
        Excluir
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => !loading && setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm border-[1.5px] border-ink bg-paper p-6"
            >
              <div className="font-display text-lg font-bold text-ink">Excluir roteiro</div>
              <div className="mt-2 text-sm text-[#55503F]">
                Tem certeza que quer excluir <span className="font-semibold text-ink">"{title}"</span>? Essa ação não
                pode ser desfeita — páginas, personagens, proposta e trama serão apagados junto.
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="border-[1.5px] border-ink px-4 py-2 text-[12.5px] font-semibold text-ink disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="border-[1.5px] border-accent-red bg-accent-red px-4 py-2 text-[12.5px] font-semibold text-[#F2EDE1] disabled:opacity-50"
                >
                  {loading ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
