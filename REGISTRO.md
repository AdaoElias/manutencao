# TechService Manager — Registro Completo da Sessão

Documento consolidado com **todas as solicitações, decisões, problemas e
resoluções** desta sessão de trabalho sobre o **TechService Manager**.

---

## Sumário
1. [Contexto e objetivo](#1-contexto-e-objetivo)
2. [Bug relatado: campos de moeda](#2-bug-relatado-campos-de-moeda)
3. [Decisões de arquitetura](#3-decisões-de-arquitetura)
4. [Recriação do app (React + Vite + Supabase)](#4-recriação-do-app-react--vite--supabase)
5. [Configuração do Supabase](#5-configuração-do-supabase)
6. [Rotina de montagem das páginas](#6-rotina-de-montagem-das-páginas)
7. [Publicação no GitHub](#7-publicação-no-github)
8. [Itens criados (estrutura final)](#8-itens-criados-estrutura-final)
9. [Pendências e próximos passos](#9-pendências-e-próximos-passos)

---

## 1. Contexto e objetivo

O usuário possui um app **TechService Manager** em `C:\DEV\manu`
(Node.js + Express + SQLite/sql.js, frontend vanilla + PWA) que gerencia
serviços de manutenção e venda de peças de informática.

**Objetivo:** recriar o sistema pensando em **hospedagem no GitHub**, já que o
app antigo dependia de backend Node + banco em arquivo e não rodava em
hospedagem estática.

---

## 2. Bug relatado: campos de moeda

**Solicitação:** "Ao mexer em campos de moeda (cadastro de produto, adicionar
produto em venda, valor de serviço), o formulário fecha e retorna para a tela
anterior."

**Investigação realizada:**
- Localizados todos os campos de moeda — usavam `type="number" step="0.01"`.
- Revisados: `public/js/*.js`, modais, handlers de teclado, service worker.
- Servidor antigo iniciado e fluxo reproduzido via **Chrome headless + CDP**.

**Resolução (diagnóstico):**
- O bug **não** foi reproduzido no código atual; a hipótese mais forte foi
  **cache do service worker** (`CACHE = 'techservice-v1'`, que nunca atualiza)
  servindo versão antiga/defeituosa.
- Na recriação, o problema foi resolvido **na raiz**: os campos de moeda
  passaram a usar `type="text"` + `inputMode="decimal"` (aceitam vírgula
  pt-BR sem travar) através do componente `MoneyInput` e das funções
  `formatMoney`/`parseMoney` em `src/lib/format.js`.

---

## 3. Decisões de arquitetura

Decisões tomadas pelo usuário via perguntas objetivas:

| Pergunta | Escolha |
|----------|---------|
| Como hospedar? | **Opção A: GitHub Pages + Supabase (Postgres)** |
| Acesso ao banco? | **Autenticação com login** (e-mail/senha + RLS) |
| Frontend? | **Framework — React + Vite** |
| Escopo? | **Mesmas funcionalidades + melhorias** |
| Onde criar? | **Projeto novo** em `C:\DEV\service` |
| Framework detalhado | **React + Vite (PWA)** |
| Conta Supabase | Não existia — o usuário criou durante a sessão |

### Stack escolhida
- **React 19** + **Vite 8** (SPA estática)
- **@supabase/supabase-js** (Postgres + Auth + RLS)
- **react-router-dom** (rotas)
- **vite-plugin-pwa** (instalável)
- Hosting: **GitHub Pages** (build estático)

---

## 4. Recriação do app (React + Vite + Supabase)

Geração do projeto em `C:\DEV\service`:
`npm create vite@latest service -- --template react`

Dependências instaladas:
`@supabase/supabase-js` • `react-router-dom` • `vite-plugin-pwa`

### Estrutura criada
```
C:\DEV\service
├── index.html                  (pt-BR, PWA, título)
├── vite.config.js              (PWA + base './' p/ GitHub Pages)
├── .env / .env.example         (chaves do Supabase → .env ignorado)
├── .gitignore                  (ignora .env, node_modules, dist)
├── SESSAO.md / PLANEJAMENTO.md (documentos)
├── supabase/
│   └── schema.sql              (9 tabelas + 8 políticas RLS)
├── public/
│   ├── icon.svg                (ícone PWA)
│   └── 404.html                (fallback SPA p/ GH Pages)
├── .github/workflows/
│   └── deploy.yml              (build + deploy automático GH Pages)
└── src/
    ├── main.jsx                (BrowserRouter + AuthProvider)
    ├── App.jsx                 (rotas + PrivateRoute)
    ├── styles.css
    ├── lib/
    │   ├── supabase.js         (cliente)
    │   └── format.js           (moeda/datas pt-BR)
    ├── context/AuthContext.jsx (login/sessão)
    ├── components/
    │   ├── Layout.jsx          (sidebar + logout)
    │   └── MoneyInput.jsx      (campo de moeda)
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Clientes.jsx
        ├── Equipamentos.jsx
        ├── Servicos.jsx        (OS + peças)
        ├── Vendas.jsx          (itens)
        ├── Garantias.jsx
        └── Produtos.jsx
```

---

## 5. Configuração do Supabase

**Passos seguidos (com o usuário, remotamente no painel web):**
1. Criada conta e projeto no Supabase.
2. **SQL Editor** → colado o `schema.sql` (9 tabelas + RLS).
   - ⚠️ **Problema encontrado:** erro de sintaxe `at or near "#"` causado por
     comentários com acentuação/`#` corrompidos ao colar.
   - ✅ **Resolução:** removidos todos os comentários do script; versão limpa
     rodou com **"Success. No rows returned"**.
3. Obtidas as credenciais (Project URL + API key **publishable**) e gravadas
   no `.env` (chaves reais não são versionadas — ver `.env.example`).
4. Valores gravados no `.env` (e `.env.example` com placeholders).

**Testes de validação:**
- `npm run build` ✅ (80 módulos, PWA gerado, sem erros)
- `npm run lint` ✅ (só warnings de otimização)
- Conexão com Supabase testada via Node: lista de `clientes` retornada sem erro.
- Servidor dev (`npx vite`) respondeu HTTP 200.

> **Segurança:** a chave `publishable` é pública e segura no frontend; a
> proteção real é o **RLS** (cada usuário vê apenas os próprios registros).
> A chave `service_role` nunca é usada no app.

---

## 6. Rotina de montagem das páginas

Páginas criadas uma a uma com padrão consistente (Supabase + RLS + `user_id`):
- **Login** — entrar/criar conta (AuthContext).
- **Dashboard** — cards de contagem + últimos serviços + garantias a vencer.
- **Clientes** — CRUD + busca.
- **Equipamentos** — CRUD vinculado ao cliente.
- **Produtos** — CRUD + preço com MoneyInput.
- **Serviços (OS)** — formulário completo, peças por OS, **recálculo automático** do valor_total (mão de obra + peças), troca de status.
- **Vendas** — CRUD + itens (produto ou livre), **recálculo automático** do total.
- **Garantias** — CRUD por equipamento + filtros (todas/ativas/vencidas).

**Bug fix de moeda aplicado:** `MoneyInput` (text + inputMode=decimal) e
`parseMoney/formatMoney` — o problema relatado dos campos de moeda.

**Recálculos automáticos:** sempre que peça/item é adicionada(o), o total de
serviço/venda é recalculado e gravado no banco.

---

## 7. Publicação no GitHub

**Solicitação:** "faz no git"

**O que foi feito:**
1. `git init` em `C:\DEV\service`; branch renomeada `master` → `main`.
2. `.env` confirmado no `.gitignore`; `.env.example` revertido p/ placeholders
   (evita vazar a chave real).
3. Removidos arquivos de template não usados (`public/favicon.svg`,
   `public/icons.svg`) e `dist/` ignorado.
4. Criado `public/404.html` (fallback SPA) para o React Router funcionar no
   GitHub Pages.
5. Criado workflow `.github/workflows/deploy.yml` (build + deploy automático).
6. Remoto apontado para **`https://github.com/AdaoElias/manutencao.git`**.
7. Commit inicial `61292b8` e **push para `main`** — concluído com sucesso
   (autenticação via Git Credential Manager).

**Passos para o usuário terminar (no GitHub):**
- **Settings → Secrets and variables → Actions:** criar dois secrets do repo:
  - `VITE_SUPABASE_URL` (Project URL do projeto Supabase)
  - `VITE_SUPABASE_ANON_KEY` (API key publishable do projeto Supabase)
- **Settings → Pages:** Source = **GitHub Actions**.
- **Rerun** do workflow após criar os secrets (o primeiro push rodou sem eles).

---

## 8. Itens criados (estrutura final)

Resumo do que existe neste momento em `C:\DEV\service`:
- App React completo e compilando (todas as páginas).
- Integração com Supabase configurada e conectada.
- PWA (manifest + service worker).
- Deploy automático para GitHub Pages configurado.
- Código publicado no repositório **`AdaoElias/manutencao`**.

---

## 9. Pendências e próximos passos

- [ ] Usuário adicionar os **2 secrets** no repositório GitHub.
- [ ] Ativar **GitHub Pages (Source: GitHub Actions)** no repo.
- [ ] Etivar **Auth por e-mail** no Supabase (Authentication → Providers → Email)
      e decidir se exige confirmação de e-mail.
- [ ] Criar conta de usuário no app para começar a usar.
- [ ] (Opcional) Testar login/uso no link público após o deploy.
- [ ] (Opcional) Instalar o **GitHub CLI (`gh`)** para facilitar futuros deploys/repos.
