'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Não foi possível criar a conta.');
      return;
    }
    const signInRes = await signIn('credentials', { email, password, redirect: false });
    if (signInRes?.error) setError('Conta criada, mas não foi possível entrar automaticamente.');
    else router.push('/scripts');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome"
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        type="password"
        className="border-[1.5px] border-ink bg-[#FBF8F1] px-3 py-2 text-sm outline-none focus:outline-accent-blue"
      />
      {error && <div className="text-xs text-accent-red">{error}</div>}
      <button type="submit" className="bg-ink py-3 text-sm font-bold text-[#F2EDE1]">
        CRIAR CONTA
      </button>
    </form>
  );
}
