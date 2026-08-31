import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../lib/format'
import MoneyInput from '../components/MoneyInput'

const TIPOS_LABEL = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'PIX', parcelado: 'Parcelado' }
const STATUS_LABEL = { pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado', cancelado: 'Cancelado' }

export default function ContasReceber() {
  const { user } = useAuth()
  const [pagamentos, setPagamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [parcelasModal, setParcelasModal] = useState(null)

  const load = async () => {
    const [pg, cl] = await Promise.all([
      supabase
        .from('pagamentos')
        .select('*, clientes(nome)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
    ])
    setPagamentos(pg.data ?? [])
    setClientes(cl.data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = pagamentos.filter((p) => {
    const matchSearch = `${p.clientes?.nome} ${p.descricao} ${TIPOS_LABEL[p.tipo]}`.toLowerCase().includes(search.toLowerCase())
    if (filtro === 'todos') return matchSearch
    return matchSearch && p.status === filtro
  })

  const totals = {
    total: filtered.reduce((s, p) => s + (p.valor_total || 0), 0),
    recebido: filtered.filter((p) => p.status === 'pago').reduce((s, p) => s + (p.valor_total || 0), 0),
    pendente: filtered.filter((p) => p.status === 'pendente').reduce((s, p) => s + (p.valor_pago || 0), 0),
    atrasado: filtered.filter((p) => p.status === 'atrasado').reduce((s, p) => s + (p.valor_pago || 0), 0),
  }

  const emptyForm = {
    cliente_id: '', tipo: 'dinheiro', valor_total: 0, valor_pago: 0,
    parcelas_total: 1, data_vencimento: '', descricao: '', observacoes: '',
  }

  const openNew = () => { setEditId(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (p) => {
    setEditId(p.id)
    setForm({
      cliente_id: p.cliente_id || '', tipo: p.tipo, valor_total: p.valor_total,
      valor_pago: p.valor_pago, parcelas_total: p.parcelas_total,
      data_vencimento: p.data_vencimento || '', descricao: p.descricao || '',
      observacoes: p.observacoes || '',
    })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        cliente_id: form.cliente_id || null,
        tipo: form.tipo,
        valor_total: form.valor_total,
        valor_pago: form.tipo === 'parcelado' ? form.valor_pago : form.valor_total,
        parcelas_total: form.tipo === 'parcelado' ? form.parcelas_total : 1,
        parcelas_pagas: form.tipo === 'parcelado' ? 1 : 1,
        data_vencimento: form.data_vencimento || null,
        descricao: form.descricao,
        observacoes: form.observacoes,
        status: form.tipo === 'parcelado' ? 'pendente' : 'pago',
      }
      if (editId) {
        await supabase.from('pagamentos').update(payload).eq('id', editId).eq('user_id', user.id)
      } else {
        await supabase.from('pagamentos').insert({ user_id: user.id, ...payload })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este pagamento?')) return
    await supabase.from('pagamentos').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  const marcarPago = async (id) => {
    await supabase.from('pagamentos').update({ status: 'pago', parcelas_pagas: pagamentos.find((p) => p.id === id)?.parcelas_total || 1 }).eq('id', id).eq('user_id', user.id)
    load()
  }

  const showParcelas = (p) => setParcelasModal(p)
  const closeParcelas = () => setParcelasModal(null)

  const registrarParcela = async (pagamentoId) => {
    const pg = pagamentos.find((p) => p.id === pagamentoId)
    if (!pg) return
    const novasPagas = pg.parcelas_pagas + 1
    const status = novasPagas >= pg.parcelas_total ? 'pago' : 'pendente'
    await supabase.from('pagamentos').update({ parcelas_pagas: novasPagas, status }).eq('id', pagamentoId).eq('user_id', user.id)
    load()
    setParcelasModal({ ...pg, parcelas_pagas: novasPagas, status })
  }

  return (
    <div>
      <h2 className="page-title">Contas a Receber</h2>

      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Total</div>
          <span className="card-number">{formatMoney(totals.total)}</span>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Recebido</div>
          <span className="card-number" style={{ color: '#28a745' }}>{formatMoney(totals.recebido)}</span>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Pendente</div>
          <span className="card-number" style={{ color: '#ffc107' }}>{formatMoney(totals.pendente)}</span>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Atrasado</div>
          <span className="card-number" style={{ color: '#dc3545' }}>{formatMoney(totals.atrasado)}</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar pagamento..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-filters">
          {['todos', 'pendente', 'pago', 'atrasado'].map((f) => (
            <button key={f} className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Pagamento</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Cliente</th><th>Tipo</th><th>Valor</th><th>Parcelas</th><th>Status</th><th>Vencimento</th><th style={{ width: 140 }}>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center">Nenhum pagamento encontrado</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.clientes?.nome || '-'}</td>
                  <td>{TIPOS_LABEL[p.tipo] || p.tipo}</td>
                  <td>{formatMoney(p.valor_total)}</td>
                  <td>{p.tipo === 'parcelado' ? `${p.parcelas_pagas}/${p.parcelas_total}` : '-'}</td>
                  <td><span className={`badge badge-${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                  <td>{p.data_vencimento ? formatDate(p.data_vencimento) : '-'}</td>
                  <td className="actions">
                    {p.status === 'pendente' && (
                      <button className="btn btn-sm btn-success" onClick={() => marcarPago(p.id)}>Pago</button>
                    )}
                    {p.tipo === 'parcelado' && p.status !== 'pago' && p.status !== 'cancelado' && (
                      <button className="btn btn-sm btn-warning" onClick={() => showParcelas(p)}>Parcelas</button>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(p)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Excluir</button>
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
              <h3>{editId ? 'Editar Pagamento' : 'Novo Pagamento'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cliente</label>
                  <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Pagamento *</label>
                  <select required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="pix">PIX</option>
                    <option value="parcelado">Parcelado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor Total *</label>
                  <MoneyInput value={form.valor_total} onChange={(v) => setForm({ ...form, valor_total: v })} />
                </div>
                {form.tipo === 'parcelado' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nº de Parcelas</label>
                      <input type="number" min="2" max="48" value={form.parcelas_total} onChange={(e) => setForm({ ...form, parcelas_total: parseInt(e.target.value) || 2 })} />
                    </div>
                    <div className="form-group">
                      <label>Valor da Parcela</label>
                      <input disabled value={formatMoney(form.valor_total / (form.parcelas_total || 1))} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Descrição</label>
                  <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data de Vencimento</label>
                  <input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
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

      {parcelasModal && (
        <ParcelasModal pagamento={parcelasModal} onClose={closeParcelas} onRegistrar={registrarParcela} />
      )}
    </div>
  )
}

function ParcelasModal({ pagamento, onClose, onRegistrar }) {
  const valorParcela = pagamento.valor_total / (pagamento.parcelas_total || 1)
  const parcelas = Array.from({ length: pagamento.parcelas_total }, (_, i) => ({
    num: i + 1,
    paga: i < pagamento.parcelas_pagas,
    valor: valorParcela,
  }))

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Parcelas — {formatMoney(pagamento.valor_total)}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <table className="table">
            <thead>
              <tr><th>Parcela</th><th>Valor</th><th>Status</th><th style={{ width: 80 }}></th></tr>
            </thead>
            <tbody>
              {parcelas.map((p) => (
                <tr key={p.num} style={{ opacity: p.paga ? 0.5 : 1 }}>
                  <td>{p.num}ª parcela</td>
                  <td>{formatMoney(p.valor)}</td>
                  <td><span className={`badge badge-${p.paga ? 'pago' : 'pendente'}`}>{p.paga ? 'Pago' : 'Pendente'}</span></td>
                  <td>
                    {!p.paga && (
                      <button className="btn btn-sm btn-success" onClick={() => onRegistrar(pagamento.id)}>Registrar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
