import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../lib/format'
import PagamentoModal from '../components/PagamentoModal'

export default function Vendas() {
  const { user } = useAuth()
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, cliente_id: '', descricao: '', observacoes: '' })
  const [carrinho, setCarrinho] = useState([])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [pagamentoModal, setPagamentoModal] = useState(null)
  const [itensModal, setItensModal] = useState(null)

  const load = async () => {
    const [vd, cl, pr] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
      supabase.from('produtos').select('id, nome, descricao, preco_venda').eq('user_id', user.id).order('nome'),
    ])
    setVendas(vd.data ?? [])
    setClientes(cl.data ?? [])
    setProdutos(pr.data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = vendas.filter((v) =>
    `${v.descricao} ${v.clientes?.nome}`.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setForm({ id: null, cliente_id: '', descricao: '', observacoes: '' })
    setCarrinho([])
    setErro('')
    setOpen(true)
  }

  const abrirItens = (v) => {
    setItensModal({ venda: v, itens: [], loadItens: (id) => loadItens(id), refresh: load })
    loadItens(v.id)
  }

  const loadItens = async (id) => {
    const { data } = await supabase.from('venda_itens').select('*').eq('venda_id', id).eq('user_id', user.id)
    setItensModal((m) => ({ ...m, itens: data ?? [] }))
  }

  const showPagamento = (v) => setPagamentoModal({
    valorTotal: v.valor_total,
    clienteId: v.cliente_id,
    vendaId: v.id,
    descricao: `Venda #${String(v.id).slice(0, 8)} — ${v.descricao || 'Venda'}`,
  })

  const addProdutoAoCarrinho = (produto) => {
    if (!produto || !produto.id) return
    setCarrinho((cart) => {
      const existente = cart.find((i) => i.produto_id === produto.id)
      if (existente) {
        return cart.map((i) =>
          i.produto_id === produto.id
            ? { ...i, quantidade: i.quantidade + 1, valor_total: (i.quantidade + 1) * i.valor_unitario }
            : i
        )
      }
      const qtd = 1
      return [...cart, {
        key: produto.id,
        produto_id: produto.id,
        descricao: `${produto.nome}${produto.descricao ? ' - ' + produto.descricao : ''}`,
        quantidade: qtd,
        valor_unitario: Number(produto.preco_venda) || 0,
        valor_total: qtd * (Number(produto.preco_venda) || 0),
      }]
    })
  }

  const alterarQtd = (produtoId, delta) => {
    setCarrinho((cart) => cart
      .map((i) => {
        if (i.produto_id !== produtoId) return i
        const novaQtd = Math.max(1, i.quantidade + delta)
        return { ...i, quantidade: novaQtd, valor_total: novaQtd * i.valor_unitario }
      })
      .filter((i) => i.quantidade > 0))
  }

  const removerItem = (produtoId) => {
    setCarrinho((cart) => cart.filter((i) => i.produto_id !== produtoId))
  }

  const subtotal = carrinho.reduce((s, i) => s + (i.valor_total || 0), 0)

  const save = async (e) => {
    e.preventDefault()
    setErro('')
    if (!form.cliente_id) { setErro('Selecione um cliente.'); return }
    if (carrinho.length === 0) { setErro('Adicione ao menos um produto ao carrinho.'); return }
    setSaving(true)
    try {
      let vendaId = form.id
      const dados = {
        cliente_id: form.cliente_id,
        descricao: form.descricao,
        observacoes: form.observacoes,
        valor_total: subtotal,
      }
      if (vendaId) {
        const { error } = await supabase.from('vendas').update(dados).eq('id', vendaId).eq('user_id', user.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('vendas').insert({ user_id: user.id, ...dados }).select('id').single()
        if (error) throw error
        vendaId = data.id
      }

      if (form.id) {
        await supabase.from('venda_itens').delete().eq('venda_id', vendaId).eq('user_id', user.id)
      }

      const itens = carrinho.map((i) => ({
        venda_id: vendaId,
        user_id: user.id,
        produto_id: i.produto_id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.valor_total,
      }))
      const { error: itErr } = await supabase.from('venda_itens').insert(itens)
      if (itErr) throw itErr

      setOpen(false)
      setCarrinho([])
      load()
    } catch (err) {
      setErro('Erro ao salvar venda: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir esta venda?')) return
    await supabase.from('vendas').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  return (
    <div>
      <h2 className="page-title">Vendas</h2>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar venda..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Venda</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Cliente</th><th>Descrição</th><th>Data</th><th>Total</th><th style={{ width: 140 }}>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center">Nenhuma venda encontrada</td></tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>#{String(v.id).slice(0, 8)}</td>
                  <td>{v.clientes?.nome || '-'}</td>
                  <td>{v.descricao || '-'}</td>
                  <td>{formatDate(v.data_venda)}</td>
                  <td>{formatMoney(v.valor_total)}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-success" onClick={() => abrirItens(v)}>Itens</button>
                    {v.valor_total > 0 && (
                      <button className="btn btn-sm btn-success" onClick={() => showPagamento(v)}>Receber</button>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => remove(v.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Nova Venda</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                {erro && <div className="alert alert-danger">{erro}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Cliente *</label>
                    <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                      <option value="">Selecione...</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                  </div>
                </div>

                <h4 className="carrinho-title">Produtos Cadastrados</h4>
                {produtos.length === 0 ? (
                  <p className="text-center" style={{ color: '#888', padding: '12px 0' }}>
                    Nenhum produto cadastrado. Cadastre produtos na aba Produtos.
                  </p>
                ) : (
                  <div className="produto-grid">
                    {produtos.map((p) => (
                      <div className="produto-card" key={p.id}>
                        <div className="produto-info">
                          <strong>{p.nome}</strong>
                          {p.descricao && <span className="produto-desc">{p.descricao}</span>}
                          <span className="produto-preco">{formatMoney(p.preco_venda)}</span>
                        </div>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => addProdutoAoCarrinho(p)}>
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <h4 className="carrinho-title">Carrinho</h4>
                {carrinho.length === 0 ? (
                  <p className="text-center" style={{ color: '#888', padding: '12px 0' }}>
                    Carrinho vazio. Clique em "Adicionar" em um produto acima.
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Produto</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th style={{ width: 150 }}></th></tr>
                      </thead>
                      <tbody>
                        {carrinho.map((i) => (
                          <tr key={i.produto_id}>
                            <td>{i.descricao}</td>
                            <td>
                              <div className="qty-control">
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => alterarQtd(i.produto_id, -1)}>−</button>
                                <span>{i.quantidade}</span>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => alterarQtd(i.produto_id, 1)}>+</button>
                              </div>
                            </td>
                            <td>{formatMoney(i.valor_unitario)}</td>
                            <td>{formatMoney(i.valor_total)}</td>
                            <td><button type="button" className="btn btn-sm btn-danger" onClick={() => removerItem(i.produto_id)}>Remover</button></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="text-right"><strong>Total</strong></td>
                          <td colSpan={2}><strong>{formatMoney(subtotal)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <div className="form-group">
                  <label>Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Venda'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itensModal && (
        <ItensModal data={itensModal} onClose={() => setItensModal(null)} />
      )}

      {pagamentoModal && (
        <PagamentoModal
          valorTotal={pagamentoModal.valorTotal}
          clienteId={pagamentoModal.clienteId}
          vendaId={pagamentoModal.vendaId}
          descricao={pagamentoModal.descricao}
          onClose={() => setPagamentoModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function ItensModal({ data, onClose }) {
  const { user } = useAuth()
  const vendaId = data.venda.id
  const itens = data.itens || []
  const total = itens.reduce((s, i) => s + (i.valor_total || 0), 0)

  const removeItem = async (id) => {
    if (!confirm('Excluir este item?')) return
    await supabase.from('venda_itens').delete().eq('id', id).eq('user_id', user.id)
    data.loadItens(vendaId)
  }

  const recompute = async () => {
    const { data: its } = await supabase.from('venda_itens').select('valor_total').eq('venda_id', vendaId).eq('user_id', user.id)
    const t = (its || []).reduce((s, i) => s + (i.valor_total || 0), 0)
    await supabase.from('vendas').update({ valor_total: t }).eq('id', vendaId).eq('user_id', user.id)
    data.refresh()
    data.loadItens(vendaId)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Itens — Venda #{String(vendaId).slice(0, 8)}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="toolbar">
            <strong>Total: {formatMoney(total)}</strong>
          </div>
          <table className="table">
            <thead><tr><th>Produto</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {itens.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum item</td></tr>}
              {itens.map((i) => (
                <tr key={i.id}>
                  <td>{i.descricao}</td>
                  <td>{i.quantidade}</td>
                  <td>{formatMoney(i.valor_unitario)}</td>
                  <td>{formatMoney(i.valor_total)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => { removeItem(i.id); recompute() }}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
