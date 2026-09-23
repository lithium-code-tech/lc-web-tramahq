import Link from 'next/link';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 border-2 border-ink bg-paper p-10">
        <div>
          <div className="font-display text-2xl font-bold text-ink">TramaHQ</div>
          <div className="mt-1 text-sm text-[#6F6A5B]">Entre para continuar seu roteiro.</div>
        </div>
        <LoginForm />
        <Link href="/register" className="text-xs text-accent-blue">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
