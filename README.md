# DREAMSPACE — ESPAÇO DOS SONHOS

Um mural particular para casais organizarem, visualizarem e conquistarem seus sonhos.
React + TypeScript + Tailwind no frontend; Supabase (PostgreSQL, Auth, Storage, Realtime) no backend.

## Segurança

- Cada casal é um quadro isolado. O isolamento é feito no banco com **Row Level Security**, não só na interface.
- Fotos ficam em bucket **privado**; o app usa links temporários assinados e a pasta raiz de cada arquivo é o id do quadro (política de storage por vínculo).
- Escritas sensíveis (criar quadro, convites, aceitar, desvincular) só existem como funções `SECURITY DEFINER` validadas.
- Só a chave pública (anon) vai para o navegador. Nunca use a `service_role`.
- `supabase/tests/` contém um teste que sobe o schema em Postgres e tenta invadir o quadro de outro casal.

## Configuração (uma vez)

1. Crie um projeto em https://supabase.com.
2. No **SQL Editor**, execute `supabase/migrations/0001_nosso_quadro.sql` inteiro.
3. **Authentication → URL Configuration**: defina *Site URL* com o endereço do site (Netlify) e inclua em *Redirect URLs*:
   `https://SEU-SITE.netlify.app/**` e `http://localhost:5173/**`.
4. **Authentication → Providers → Email**: mantenha e-mail/senha ativo. (Opcional: desligar "Confirm email" para entrar direto após o cadastro.)
5. Copie *Project URL* e a chave *anon/publishable* (Project Settings → API).

## Rodar localmente

```bash
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Deploy no Netlify

Conecte o repositório. O `netlify.toml` já define build (`npm run build`), pasta `dist` e o fallback de rotas.
Em **Site configuration → Environment variables** cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e faça um novo deploy.

## Como funciona o convite

Quem cria o quadro gera um convite (link + código de 10 caracteres, validade de 14 dias; e-mail opcional para restringir quem pode aceitar).
O envio é feito por WhatsApp, e-mail ou compartilhamento do aparelho. A outra pessoa cria a conta (ou entra) e aceita; passam a ver o mesmo quadro em tempo real.
Cada pessoa participa de apenas um quadro nesta versão.

## Estrutura

- `supabase/migrations`: tabelas, RLS, triggers, funções e storage.
- `supabase/tests`: teste de isolamento (`00_supabase_stub.sql` + `02_rls_tests.sql`).
- `src/components/Mural.tsx`: o mural (grade de meia-coluna, formatos quadrado/retrato/paisagem/destaque).
- `src/state/board.tsx`: dados, URLs assinadas, tempo real e operações.
