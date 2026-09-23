'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'idle' | 'submitting' | 'success';

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPhase('submitting');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Não foi possível criar a conta.');
        setPhase('idle');
        return;
      }

      setPhase('success');
      setTimeout(() => router.push('/login?registered=1'), 1200);
    } catch {
      setError('Não foi possível criar a conta.');
      setPhase('idle');
    }
  }

  const disabled = phase !== 'idle';

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        disabled={disabled}
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue disabled:opacity-60"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        disabled={disabled}
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue disabled:opacity-60"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        type="password"
        disabled={disabled}
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue disabled:opacity-60"
      />
      {error && <div className="text-xs text-accent-red">{error}</div>}
      {phase === 'success' && (
        <div className="border-[1.5px] border-accent-blue bg-[#EAF0F8] px-3 py-2 text-xs text-accent-blue">
          Conta criada com sucesso! Levando você pro login…
        </div>
      )}
      <button
        type="submit"
        disabled={disabled}
        className="bg-ink py-3 text-sm font-bold text-[#F2EDE1] disabled:opacity-50"
      >
        {phase === 'submitting' ? 'Criando…' : phase === 'success' ? 'CONTA CRIADA ✓' : 'CRIAR CONTA'}
      </button>
    </form>
  );
}
