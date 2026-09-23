'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    setJustRegistered(new URLSearchParams(window.location.search).get('registered') === '1');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) setError('Email ou senha inválidos.');
      else router.push('/scripts');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {justRegistered && (
        <div className="border-[1.5px] border-accent-blue bg-[#EAF0F8] px-3 py-2 text-xs text-accent-blue">
          Conta criada com sucesso! Entre para continuar.
        </div>
      )}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        disabled={loading}
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue disabled:opacity-60"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        type="password"
        disabled={loading}
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue disabled:opacity-60"
      />
      {error && <div className="text-xs text-accent-red">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="bg-ink py-3 text-sm font-bold text-[#F2EDE1] disabled:opacity-50"
      >
        {loading ? 'Entrando…' : 'ENTRAR'}
      </button>
    </form>
  );
}
