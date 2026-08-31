# TechService Manager

Gerenciador de serviços de manutenção e venda de peças de informática.

App web PWA (React + Vite) hospedado de graça no **GitHub Pages**, com banco
de dados e autenticação no **Supabase** (Postgres + Row Level Security).
Cada usuário acessa/loga com e-mail e senha e vê apenas os próprios dados.

## Funcionalidades

- **Autenticação** — login e criação de conta (e-mail/senha), proteção de rotas.
- **Dashboard** — cards de clientes, equipamentos, serviços, garantias e
  resumo financeiro (recebido / a receber / atrasado).
- **Clientes** — CRUD e busca.
- **Equipamentos** — CRUD vinculado ao cliente.
- **Produtos** — CRUD com preço (moeda pt-BR).
- **Serviços (OS)** — ordem de serviço por cliente + equipamento, peças por OS
  com recálculo automático do total, troca de status, registro de pagamento.
- **Vendas** — fluxo de **carrinho**: adiciona produtos cadastrados, define
  quantidade e calcula o total automaticamente.
- **Contas a Receber** — pagamentos (Dinheiro, Cartão, PIX, Parcelado) com
  resumo financeiro, filtros por status e controle de parcelas.
- **Garantias** — CRUD por equipamento e filtros (ativas / vencidas).
- **PWA** — instalável no celular/desktop.

## Stack

React 19 · Vite 8 · @supabase/supabase-js · react-router-dom · vite-plugin-pwa

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Configuração do Supabase

1. Crie um projeto gratuito em <https://supabase.com>.
2. No **SQL Editor**, cole o conteúdo de `supabase/runnable_schema.sql` e rode.
3. Em **Project Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
4. Crie um arquivo `.env` na raiz (veja `.env.example`):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

O `.env` nunca é versionado (está no `.gitignore`). A chave `anon` é pública e
fica no frontend; a segurança é garantida pelas políticas de **Row Level
Security** (cada usuário acessa só os próprios registros).

## Publicação no GitHub Pages

1. Suba o código para um repositório (sem `.env` e `node_modules`).
2. Em **Settings → Secrets and variables → Actions**, crie os secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Em **Settings → Pages**, defina **Source = GitHub Actions**.
4. O workflow `.github/workflows/deploy.yml` faz o build e o deploy automático
   em cada push para `main`.

O site ficará disponível em `https://<usuário>.github.io/<repositorio>/`.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção (pasta dist/)
npm run preview  # pré-visualiza o build
npm run lint     # lint (oxlint)
```
