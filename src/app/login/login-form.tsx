'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) setError('Email ou senha inválidos.');
    else router.push('/scripts');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
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
        ENTRAR
      </button>
    </form>
  );
}
