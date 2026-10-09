# TramaHQ

Editor de roteiro de quadrinhos — página → quadro → diálogo (personagem + fala) →
onomatopeia, com modo **Full Script** (quadro a quadro) e **Plot** (página a página,
estilo Marvel Method), export em PDF formatado, e a mesma stack do Programmato.

## Stack

Next.js 14 (App Router) · Prisma · PostgreSQL · NextAuth (credentials) · Tailwind · pdf-lib

## Modelo de dados

- `Script` → várias `Page` (numeradas)
- `Page` → várias `Block` (ordenadas) + `plotText` (resumo usado no modo Plot)
- `Block.type`: `QUADRO` | `DIALOGO` | `ONOMATOPEIA`
  - `DIALOGO` usa `character` (nome) + `text` (fala)
  - `QUADRO` usa `number` (número do quadro na página) + `text` (descrição)
  - `ONOMATOPEIA` usa só `text`
- `Script` → várias `Character` (elenco)
- `Script` → várias `Reference` (imagens de referência, ver abaixo)

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` com um Postgres seu
   (local, Supabase, Neon, Railway etc.) e um `NEXTAUTH_SECRET` aleatório:
   ```bash
   cp .env.example .env
   ```
3. Rode a primeira migration (cria as tabelas):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Suba o servidor:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:3000`, crie uma conta em `/register` e comece um roteiro.

## Fluxo de escrita (Full Script)

Dentro de um quadro, **Enter** avança pelo ciclo:

```
QUADRO → PERSONAGEM → FALA → ONOMATOPEIA → QUADRO (próximo) → ...
```

- **Shift+Enter** quebra linha dentro do mesmo campo em vez de avançar.
- Se você der Enter num campo **vazio**, o app não cria diálogo nem onomatopeia à toa —
  pula direto para um novo quadro.

## Modo Plot

Um bloco numerado por página. Enter avança para o número da página seguinte; na
última página, Enter cria uma página nova automaticamente (sincronizada com o Full
Script).

## Referências visuais

Aba **Referências**: galeria do projeto. Arraste imagens, cole com Ctrl+V ou escolha
arquivos. Cada imagem pode ter legenda e ficar ligada a:

- **Projeto** (moodboard geral: estilo, paleta, ambientação)
- **Personagem**: aparece ao clicar no nome dele na coluna da direita
- **Página**: aparece na coluna da direita enquanto você escreve o Roteiro daquela página

As imagens são compactadas no navegador antes do upload (lado maior até 1600 px, WebP,
mais uma miniatura de 320 px) e guardadas no Postgres (`Reference.data` / `Reference.thumb`).
Como páginas e personagens são recriados a cada autosave, a ligação é pelo **nome do
personagem** ou por **edição + número da página**, não por id. Renomear um personagem na
Proposta leva as referências dele junto.

## Export em PDF

Botão "Exportar PDF" no editor gera um PDF em Courier, formato de roteiro
profissional: descrição do quadro em itálico, nome do personagem centralizado
em caixa alta, fala centralizada logo abaixo, onomatopeias destacadas. Funciona
tanto no modo Full Script quanto no Plot (`?mode=full` ou `?mode=plot`).

## Próximos passos sugeridos

- Compartilhamento de link somente-leitura para o desenhista comentar por quadro
  (mais barato que colaboração em tempo real)
- Ajustar o save de página inteira (`PATCH /api/scripts/[id]`) para algo mais
  granular se o roteiro crescer muito (hoje ele substitui páginas e personagens
  inteiros a cada autosave — simples, mas não é o mais eficiente em escala)
