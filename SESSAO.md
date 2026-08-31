# TechService Manager — Sessão de Recriação

Histórico de tudo que foi solicitado, decidido e feito nesta sessão
para recriar o aplicativo como **React + Vite + Supabase (GitHub Pages)**.

---

## 1. Contexto inicial

O usuário tem um app **Node.js + Express + SQLite (sql.js)** em `C:\DEV\manu`
(chamado **TechService Manager**), que gerencia serviços de manutenção e venda
de peças de informática. Ele queria hospedar o projeto no GitHub.

### Análise de compatibilidade original (app antigo)
- Stack atual: Node.js + Express 4, `sql.js` (SQLite em arquivo `data.db`),
  frontend vanilla HTML/CSS/JS + PWA (`sw.js`, `manifest.json`).
- **Compatível com GitHub** como repositório de código-fonte.
- **Não** roda em GitHub Pages (é app Node com backend/banco).

## 2. Bug relatado (ponto de partida da recriação)

> "Ao mexer em campos de moeda (cadastro de produto, adicionar produto em venda,
> valor de serviço), o formulário fecha e retorna para a tela anterior."

### Investigação
- Localizei todos os campos de moeda: usavam `type="number" step="0.01"`.
- Verifiquei frontend (`produtos.js`, `vendas.js`, `servicos.js`), handlers de
  teclado, modal overlay (fechamento por clique-fora) e o service worker.
- **Subi o servidor** e reproduzi o fluxo via **Chrome headless + Chrome DevTools
  Protocol (CDP)** navegando e digitando nos campos.
- **Resultado:** o bug **não foi reproduzido** no código atual servido
  (o modal permanecia aberto ao digitar). Conclusão: provável **cache do
  service worker** (`CACHE = 'techservice-v1'`, que nunca atualiza) servindo
  uma versão antiga/defeituosa do app.

### Consequência
Como o app dependia de backend + banco em arquivo, não atendia bem à
hospedagem no GitHub. O usuário optou por **recriar** o sistema.

## 3. Decisões tomadas pelo usuário

| Pergunta | Escolha |
|----------|---------|
| Como hospedar? | **Opção A: GitHub Pages + Supabase (Postgres)** |
| Acesso ao banco? | **Autenticação com login** (e-mail/senha + RLS) |
| Frontend? | **Framework — React + Vite** |
| Escopo? | **Mesmas funcionalidades + melhorias** |
| Onde criar? | **Projeto novo** em `C:\dev\service` |

## 4. O que foi feito nesta sessão

### Estrutura criada em `C:\dev\service`
```
C:\dev\service
├── index.html                     (placeholder — ainda precisa ser montado)
├── vite.config.js                 (Vite — ainda precisa configurar PWA)
├── .env                           (chaves placeholder do Supabase)  ← git-ignored
├── .env.example                   (modelo de variáveis)
├── supabase/
│   └── schema.sql                 (tabelas + RLS prontos p/ colar no SQL Editor)
└── src/
    ├── lib/
    │   ├── supabase.js            (cliente Supabase via variáveis de ambiente)
    │   └── format.js              (utils moeda pt-BR + datas)
    ├── context/
    │   └── AuthContext.jsx        (login, cadastro, sair, sessão)
    ├── components/
    │   ├── Layout.jsx             (sidebar + navegação + logout)
    │   ├── MoneyInput.jsx         (campo de moeda pt-BR — fix do bug)  ★
    ├── pages/
    │   ├── Login.jsx              (entrar / criar conta)
    │   └── Dashboard.jsx          (cards + últimos serviços + garantias)
    └── styles.css                 (estilos do app — criado)
```

### Componentes/páginas **ainda pendentes**
- Páginas de dados: `Clientes`, `Equipamentos`, `Serviços (OS)`, `Vendas`,
  `Garantias`, `Produtos`.
- Roteamento principal (`App.jsx` / `main.jsx`) com proteção de autenticação
  (redirecionar para `/login` quando deslogado).
- `index.html` real (título/idioma pt-BR, tema) e remoção dos arquivos de
  demonstração do Vite (`App.css`, `index.css`, `assets/`).
- Configuração PWA (`vite-plugin-pwa`: manifest + service worker + ícones).
- Build de verificação (`npm run build`).

### Pacotes instalados
- Base: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `oxlint`.
- Adicionais: `@supabase/supabase-js`, `react-router-dom`, `vite-plugin-pwa`.

## 5. Fix do bug de moeda na nova versão

Em vez de `type="number"`, usei `type="text"` + `inputMode="decimal"` no
componente `MoneyInput`, que:
- aceita **vírgula** e ponto decimais por usuário (padrão pt-BR);
- mantém apenas dígitos e vírgula (`/^\d+[,]?\d*$/`);
- converte com `parseMoney()` para enviar número correto ao banco.

Isso elimina a classe de problemas dos campos numéricos que motivou a recriação.

---

## 6. Próximos passos (resumo)
1. Montar `index.html`, `main.jsx` e `App.jsx` (roteamento + auth guard).
2. Criar as seis páginas de dados.
3. Configurar PWA e ícones.
4. `npm run build` para garantir que compila.
5. (Usuário) criar conta/projeto no [Supabase](https://supabase.com) e colar
   o `supabase/schema.sql`.
6. Configurar `.env` com URL + anon key reais.
7. Publicar no GitHub + ativar GitHub Pages.

---

## Atualizações posteriores (pós-deploy)

### Pagamentos e Contas a Receber (novo módulo)
- Nova tabela `public.pagamentos` (tipo: dinheiro, cartao, pix, parcelado;
  status: pendente, pago, atrasado, cancelado; controle de parcelas).
- Nova página **Contas a Receber** (`src/pages/ContasReceber.jsx`, rota `/contas`):
  resumo financeiro (total, recebido, pendente, atrasado), filtros por status,
  CRUD de pagamentos e **registro de parcelas** (x/y).
- Componente reutilizável **PagamentoModal** (`src/components/PagamentoModal.jsx`).
- Botão "Receber" em **Serviços** (OS concluída/entregue) e **Vendas**.
- **Dashboard** ganhou seção de resumo financeiro (recebido / a receber / atrasado).

### Vendas redesenhada como carrinho
- Modal "Nova Venda" agora funciona como **carrinho de supermercado**:
  lista produtos cadastrados com preço, botão "Adicionar", controle de
  quantidade (+/−), remover itens e **total calculado automaticamente**
  (qtd × preço cadastrado).
- Salva venda + itens + total em uma única ação; recalcula ao remover itens.
- Correção: produtos cadastrados passam a ser carregados corretamente para a venda.

### Correções
- **MoneyInput**: sincronização do valor externo corrigida (evita comportamento
  que fechava o modal ao digitar valor em Serviços).
- **Serviços**: `save()` com captura de erro + alert; equipamentos do cliente
  agora são recarregados ao editar uma OS (antes o campo obrigatório ficava vazio).
- **Deploy/GitHub Pages**: configuração de *Source = GitHub Actions* e **secrets**
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) necessários para o build não
  gerar bundle sem chaves (sintoma: tela branca com `supabaseUrl is required`).
- Roteamento em subcaminho resolvido com `basename` dinâmico em `main.jsx`.
