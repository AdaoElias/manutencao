create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  endereco text,
  created_at timestamptz default now()
);

create table if not exists public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null,
  marca text,
  modelo text,
  numero_serie text,
  observacoes text,
  created_at timestamptz default now()
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  preco_venda numeric(12,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  descricao_problema text,
  descricao_servico text,
  tipo_servico text,
  relato text,
  status text default 'aberto'
    check (status in ('aberto','andamento','concluido','entregue')),
  valor_mao_obra numeric(12,2) default 0,
  valor_total numeric(12,2) default 0,
  data_abertura timestamptz default now(),
  data_conclusao timestamptz,
  observacoes text
);

create table if not exists public.servico_pecas (
  id uuid primary key default gen_random_uuid(),
  servico_id uuid not null references public.servicos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  quantidade numeric(10,2) default 1,
  valor_unitario numeric(12,2) default 0,
  valor_total numeric(12,2) default 0
);

create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  descricao text,
  valor_total numeric(12,2) default 0,
  data_venda timestamptz default now(),
  observacoes text
);

create table if not exists public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  descricao text not null,
  quantidade numeric(10,2) default 1,
  valor_unitario numeric(12,2) default 0,
  valor_total numeric(12,2) default 0
);

create table if not exists public.garantias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipamento_id uuid not null references public.equipamentos(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  venda_id uuid references public.vendas(id) on delete set null,
  data_inicio date not null,
  data_fim date not null,
  descricao text
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  venda_id uuid references public.vendas(id) on delete set null,
  tipo text not null check (tipo in ('dinheiro','cartao','pix','parcelado')),
  valor_total numeric(12,2) not null default 0,
  valor_pago numeric(12,2) not null default 0,
  parcelas_total integer default 1,
  parcelas_pagas integer default 0,
  data_pagamento timestamptz default now(),
  data_vencimento date,
  descricao text,
  observacoes text,
  status text default 'pendente' check (status in ('pendente','pago','atrasado','cancelado')),
  created_at timestamptz default now()
);

alter table public.clientes enable row level security;
alter table public.equipamentos enable row level security;
alter table public.produtos enable row level security;
alter table public.servicos enable row level security;
alter table public.servico_pecas enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.garantias enable row level security;
alter table public.pagamentos enable row level security;

drop policy if exists "clientes_own" on public.clientes;
create policy "clientes_own" on public.clientes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "equipamentos_own" on public.equipamentos;
create policy "equipamentos_own" on public.equipamentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "produtos_own" on public.produtos;
create policy "produtos_own" on public.produtos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "servicos_own" on public.servicos;
create policy "servicos_own" on public.servicos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "servico_pecas_own" on public.servico_pecas;
create policy "servico_pecas_own" on public.servico_pecas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "vendas_own" on public.vendas;
create policy "vendas_own" on public.vendas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "venda_itens_own" on public.venda_itens;
create policy "venda_itens_own" on public.venda_itens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "garantias_own" on public.garantias;
create policy "garantias_own" on public.garantias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "pagamentos_own" on public.pagamentos;
create policy "pagamentos_own" on public.pagamentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
