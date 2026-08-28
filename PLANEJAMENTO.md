# TechService Manager v2 — Planejamento e Escopo

Recriação do gerenciador de serviços de manutenção e venda de peças de
informática. Nova arquitetura orientada a hospedagem no GitHub.

---

## 1. Objetivo

Reconstruir o TechService Manager com stack moderna e hospedável de graça:

- **Frontend:** React + Vite (SPA estática)
- **Hospedagem:** GitHub Pages
- **Backend/Banco:** Supabase (Postgres + Auth + Row Level Security)
- **PWA:** instalável no celular/desktop (manifest + service worker)

Sem servidor Node próprio — toda a persistência via Supabase.

---

## 2. Arquitetura

```
[ Navegador / Celular ]
        │
        │  HTTPS (REST/PostgREST)
        ▼
[ GitHub Pages ]  ──  app React estático (build)
        │
        ▼
[ Supabase ]  ──  Postgres + Auth + RLS
        │
        ├── Tabelas de negócio (clientes, OS, vendas, ...)
        ├── Auth (login e-mail/senha)
        └── RLS (cada usuário vê só os próprios dados)
```

### Decisões-chave
| Item | Escolha | Motivo |
|------|---------|--------|
| Framework | React 19 + Vite | Popular, ecossistema, build p/ estático, PWA |
| Roteamento | react-router-dom | SPA com telas e proteção de rota |
| Banco | Supabase (Postgres) | Grátis, multiusuário, RLS, Auth integrado |
| Autenticação | e-mail/senha (Supabase Auth) | Segurança por usuário |
| Multi-usuário | Sim (coluna `user_id` + RLS) | Login individual |
| Deploy | GitHub Pages | Gratuito e simples |

---

## 3. Modelo de dados (Supabase)

Todas as tabelas têm `user_id uuid references auth.users(id) on delete cascade`
e políticas RLS (`auth.uid() = user_id`). SQL completo em
[`supabase/schema.sql`](supabase/schema.sql).

| Entidade | Campos principais |
|----------|-------------------|
| `clientes` | nome*, telefone, email, endereco |
| `equipamentos` | cliente_id*, tipo*, marca, modelo, numero_serie, observacoes |
| `produtos` | nome*, descricao, preco_venda |
| `servicos` (OS) | equipamento_id*, cliente_id*, tipo_servico, relato, problema, serviço, status, valor_mao_obra, valor_total |
| `servico_pecas` | servico_id*, descricao*, quantidade, valor_unitario, valor_total |
| `vendas` | cliente_id*, descricao, valor_total, data_venda, observacoes |
| `venda_itens` | venda_id*, produto_id, descricao*, quantidade, valor_unitario, valor_total |
| `garantias` | equipamento_id*, servico_id, venda_id, data_inicio*, data_fim*, descricao |

---

## 4. Telas / Funcionalidades (escopo)

### Autenticação
- Tela de login e criação de conta (e-mail/senha).
- Proteção de rotas (redireciona para `/login` quando deslogado).
- Botão "Sair".

### Dashboard
- Cards: total de clientes, equipamentos, serviços abertos, garantias ativas.
- Lista dos últimos serviços.
- Lista de garantias a vencer.

### Clientes
- CRUD (cadastrar, editar, excluir, buscar).
- Dados: nome, telefone, email, endereço.

### Equipamentos
- CRUD por cliente (vínculo), com busca.
- Dados: tipo, marca, modelo, nº de série, observações.

### Produtos
- CRUD, campo de preço de venda com moeda pt-BR.
- Dados: nome, descrição, preço.

### Serviços (Ordem de Serviço)
- Nova OS vinculada a cliente + equipamento.
- Campos: tipo de serviço, relato (pré-cadastrado), problema, serviço realizado,
  valor de mão de obra, status (aberto/andamento/concluido/entregue), observações.
- Adicionar/editar/excluir **peças** por OS (qtd, valor unitário, total).
- **Recalculo automático** do `valor_total` (mão de obra + peças).

### Vendas
- CRUD de venda vinculada a cliente.
- Adicionar itens (produto ou descrição livre, qtd, valor unitário).
- **Recalculo automático** do `valor_total`.
- Lista de itens por venda.

### Garantias
- CRUD por equipamento (opcional vínculo com OS/venda).
- Filtros: todas / ativas / vencidas.

### Relatórios
- Geração de relatório (OS ou venda) com pré-visualização e **imprimir/PDF**.

### Melhorias sobre o app antigo (novidades)
- **Acesso multiusuário** com login (antes: banco único local).
- **Dados em nuvem** — acessível de qualquer dispositivo.
- **Campos de moeda pt-BR** corrigidos (vírgula decimal, sem travar) — fix do bug.
- Validações de formulário.
- PWA instalável.

---

## 5. Stack técnica e arquivos

```
React 19  +  Vite 8  +  @supabase/supabase-js  +  react-router-dom  +  vite-plugin-pwa
```

- `src/lib/supabase.js` — cliente Supabase (lê `VITE_SUPABASE_*` do `.env`).
- `src/lib/format.js` — formatação/parse de moeda e datas pt-BR.
- `src/context/AuthContext.jsx` — estado de autenticação.
- `src/components/` — Layout, MoneyInput, (futuro) Modal/Table reutilizáveis.
- `src/pages/` — uma pasta por tela.
- `supabase/schema.sql` — DDL das tabelas + políticas RLS.

---

## 6. Configuração do Supabase (guia rápido)

1. Criar conta gratuita em <https://supabase.com>.
2. **New project** → nome + senha do banco + região.
3. Aguardar provisionamento (~1 min).
4. **SQL Editor** → New query → colar o conteúdo de `supabase/schema.sql` → **Run**.
5. **Authentication → Providers → Email**: ativar "Confirm email" (opcional).
6. **Project Settings → API**:
   - copiar **Project URL** → `VITE_SUPABASE_URL`
   - copiar **anon public key** → `VITE_SUPABASE_ANON_KEY`
7. Colar no `.env` (nunca subir o `.env` real para o GitHub).

> A chave `anon` é pública e fica no frontend — a **segurança** é garantida
> pelo RLS (as políticas impedem acesso a dados de outros usuários).

---

## 7. Publicação no GitHub

- Criar repositório público/privado e fazer push do código (sem `.env` e sem
  `node_modules` — já no `.gitignore`).
- **GitHub Pages:** Settings → Pages → Source → **GitHub Actions**
  (ou ramo `gh-pages`) → apontar para a pasta `dist` do build.
- Atualizar `base` no `vite.config.js` se hospedar em subcaminho
  (ex.: `https://user.github.io/repo/`).

---

## 8. Riscos / decisões futuras
- **Segredo da API:** ok porque RLS protege; nunca expor `service_role` key.
- **Limites gratuitos do Supabase** (armazenamento/requisições) — suficientes
  para uso de negócio pequeno.
- **E-mail de confirmação:** exigirá e-mail real do usuário para login.
- **Acesso anônimo/visitante** não está no escopo (seria nova política RLS).
