import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma conta com este email.' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name } });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('Falha ao criar conta:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma conta com este email.' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Erro no servidor ao criar a conta. Verifique se o banco de dados está acessível e migrado.' },
      { status: 500 }
    );
  }
}
