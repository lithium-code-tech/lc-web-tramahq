'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir "${title}"? Essa ação não pode ser desfeita.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/scripts/${scriptId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className={className || 'text-[11px] font-semibold text-accent-red disabled:opacity-50'}>
      {loading ? 'Excluindo…' : 'Excluir'}
    </button>
  );
}
