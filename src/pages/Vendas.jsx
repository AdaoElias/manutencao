import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../lib/format'
import MoneyInput from '../components/MoneyInput'

export default function Vendas() {
  const { user } = useAuth()
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, cliente_id: '', descricao: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [itensModal, setItensModal] = useState(null)
  const [produtos, setProdutos] = useState([])

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

  const openNew = () => { setForm({ id: null, cliente_id: '', descricao: '', observacoes: '' }); setOpen(true) }
  const openEdit = (v) => { setForm({ id: v.id, cliente_id: v.cliente_id, descricao: v.descricao || '', observacoes: v.observacoes || '' }); setOpen(true) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { cliente_id: form.cliente_id, descricao: form.descricao, observacoes: form.observacoes }
      if (form.id) {
        await supabase.from('vendas').update(payload).eq('id', form.id).eq('user_id', user.id)
      } else {
        await supabase.from('vendas').insert({ user_id: user.id, ...payload })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const showItens = (v) => {
    setItensModal({ venda: v, itens: [], produtos, loadItens: (id) => loadItens(id), refresh: load })
    loadItens(v.id)
  }

  const loadItens = async (id) => {
    const { data } = await supabase.from('venda_itens').select('*').eq('venda_id', id).eq('user_id', user.id)
    setItensModal((m) => ({ ...m, itens: data ?? [] }))
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
              <tr><th>ID</th><th>Cliente</th><th>Descrição</th><th>Data</th><th>Total</th><th style={{ width: 110 }}>Ações</th></tr>
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
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(v)}>Editar</button>
                    <button className="btn btn-sm btn-success" onClick={() => showItens(v)}>Itens</button>
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
          <div className="modal">
            <div className="modal-header">
              <h3>{form.id ? 'Editar Venda' : 'Nova Venda'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
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
                <div className="form-group">
                  <label>Observações</label>
                  <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itensModal && (
        <ItensModal
          data={itensModal}
          onClose={() => setItensModal(null)}
        />
      )}
    </div>
  )
}

function ItensModal({ data, onClose }) {
  const { user } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ produto_id: '', descricao: '', quantidade: 1, valor_unitario: 0 })
  const vendaId = data.venda.id

  const recomputeTotal = async () => {
    const { data: itens } = await supabase.from('venda_itens').select('valor_total').eq('venda_id', vendaId)
    const total = (itens || []).reduce((s, i) => s + (i.valor_total || 0), 0)
    await supabase.from('vendas').update({ valor_total: total }).eq('id', vendaId).eq('user_id', user.id)
    data.refresh()
  }

  const addItem = async (e) => {
    e.preventDefault()
    const vTotal = form.quantidade * form.valor_unitario
    await supabase.from('venda_itens').insert({
      venda_id: vendaId, user_id: user.id,
      produto_id: form.produto_id || null,
      descricao: form.descricao, quantidade: form.quantidade,
      valor_unitario: form.valor_unitario, valor_total: vTotal,
    })
    recomputeTotal()
    setAddOpen(false)
    setForm({ produto_id: '', descricao: '', quantidade: 1, valor_unitario: 0 })
    data.loadItens(vendaId)
  }

  const removeItem = async (id) => {
    if (!confirm('Excluir este item?')) return
    await supabase.from('venda_itens').delete().eq('id', id)
    recomputeTotal()
    data.loadItens(vendaId)
  }

  const selectProduto = (produtoId) => {
    const p = (data.produtos || []).find((x) => x.id === produtoId)
    setForm((f) => ({
      ...f,
      produto_id: produtoId,
      descricao: p ? `${p.nome}${p.descricao ? ' - ' + p.descricao : ''}` : f.descricao,
      valor_unitario: p ? p.preco_venda : f.valor_unitario,
    }))
  }

  const itens = data.itens || []
  const total = itens.reduce((s, i) => s + (i.valor_total || 0), 0)

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
            <button className="btn btn-sm btn-success" onClick={() => setAddOpen(true)}>+ Add Item</button>
          </div>
          <table className="table">
            <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {itens.length === 0 && <tr><td colSpan={5} className="text-center">Nenhum item</td></tr>}
              {itens.map((i) => (
                <tr key={i.id}>
                  <td>{i.descricao}</td>
                  <td>{i.quantidade}</td>
                  <td>{formatMoney(i.valor_unitario)}</td>
                  <td>{formatMoney(i.valor_total)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(i.id)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {addOpen && (
          <form onSubmit={addItem}>
            <div className="modal-body" style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
              <div className="form-group">
                <label>Produto</label>
                <select value={form.produto_id} onChange={(e) => selectProduto(e.target.value)}>
                  <option value="">Selecione um produto (opcional)...</option>
                  {(data.produtos || []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — {formatMoney(p.preco_venda)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Descrição *</label>
                <input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantidade</label>
                  <input type="number" min="1" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: parseFloat(e.target.value) || 1 })} />
                </div>
                <div className="form-group">
                  <label>Valor Unitário</label>
                  <MoneyInput value={form.valor_unitario} onChange={(v) => setForm({ ...form, valor_unitario: v })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Adicionar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
