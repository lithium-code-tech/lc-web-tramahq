import Link from 'next/link';
import RegisterForm from './register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 border-2 border-ink bg-paper p-10">
        <div>
          <div className="font-display text-2xl font-bold text-ink">Criar conta</div>
          <div className="mt-1 text-sm text-[#6F6A5B]">Comece a roteirizar sua história.</div>
        </div>
        <RegisterForm />
        <Link href="/login" className="text-xs text-accent-blue">
          Já tenho conta
        </Link>
      </div>
    </div>
  );
}
