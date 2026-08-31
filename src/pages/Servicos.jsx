import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import MoneyInput from '../components/MoneyInput'
import PagamentoModal from '../components/PagamentoModal'

const statusMap = { aberto: 'aberto', andamento: 'andamento', concluido: 'concluido', entregue: 'entregue' }
const TIPOS = ['Manutenção', 'Revisão', 'Venda', 'Garantia', 'Orçamento', 'Outros']
const RELATOS = [
  'Computador lento', 'Superaquecimento', 'Tela azul (BSOD)', 'Falha no disco rígido',
  'Problemas com drivers', 'Computador não liga', 'Reinicialização inesperada',
  'Falha na fonte de alimentação', 'Problemas de rede/Wi-Fi', 'Travamentos frequentes',
  'Tela preta ao iniciar', 'Perda de dados', 'Barulhos estranhos',
  'Problemas com atualizações do Windows', 'Malware ou vírus',
]

export default function Servicos() {
  const { user } = useAuth()
  const [servicos, setServicos] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [pecasModal, setPecasModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const [pagamentoModal, setPagamentoModal] = useState(null)

  const load = async () => {
    const [sv, cl] = await Promise.all([
      supabase
        .from('servicos')
        .select('*, clientes(nome), equipamentos(tipo, marca, modelo)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
    ])
    setServicos(sv.data ?? [])
    setClientes(cl.data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const emptyForm = {
    cliente_id: '', equipamento_id: '', tipo_servico: '', relato: '',
    descricao_problema: '', descricao_servico: '', valor_mao_obra: 0, observacoes: '',
  }

  const openNew = () => { setEditId(null); setForm(emptyForm); setEquipOptions([]); setOpen(true) }
  const openEdit = async (s) => {
    setEditId(s.id)
    setForm({
      cliente_id: s.cliente_id, equipamento_id: s.equipamento_id, tipo_servico: s.tipo_servico || '',
      relato: s.relato || '', descricao_problema: s.descricao_problema || '',
      descricao_servico: s.descricao_servico || '', valor_mao_obra: s.valor_mao_obra || 0,
      observacoes: s.observacoes || '',
    })
    const eqs = await loadEquipByCliente(s.cliente_id)
    setEquipOptions(eqs)
    setOpen(true)
  }

  const loadEquipByCliente = async (clienteId) => {
    if (!clienteId) return []
    const { data } = await supabase
      .from('equipamentos')
      .select('id, tipo, marca, modelo')
      .eq('user_id', user.id)
      .eq('cliente_id', clienteId)
    return data ?? []
  }

  const handleClienteChange = async (clienteId) => {
    setForm((f) => ({ ...f, cliente_id: clienteId, equipamento_id: '' }))
    const eqs = await loadEquipByCliente(clienteId)
    setEquipOptions(eqs)
  }

  const [equipOptions, setEquipOptions] = useState([])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        cliente_id: form.cliente_id, equipamento_id: form.equipamento_id,
        tipo_servico: form.tipo_servico, relato: form.relato,
        descricao_problema: form.descricao_problema, descricao_servico: form.descricao_servico,
        valor_mao_obra: Number(form.valor_mao_obra) || 0, observacoes: form.observacoes,
        status: 'aberto',
      }
      let error
      if (editId) {
        delete payload.status
        ;({ error } = await supabase.from('servicos').update(payload).eq('id', editId).eq('user_id', user.id))
      } else {
        ;({ error } = await supabase.from('servicos').insert({ user_id: user.id, ...payload }))
      }
      if (error) throw error
      setOpen(false)
      load()
    } catch (err) {
      alert('Erro ao salvar o serviço: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  const loadPecas = async (id) => {
    const { data } = await supabase.from('servico_pecas').select('*').eq('servico_id', id)
    setPecasModal((m) => ({ ...m, pecas: data ?? [] }))
  }

  const showPecas = (s) => {
    setPecasModal({ servico: s, pecas: [], loadPecas: (id) => loadPecas(id), refresh: load })
    loadPecas(s.id)
  }

  const showStatus = (s) => setStatusModal({ id: s.id, status: s.status })

  const showPagamento = (s) => setPagamentoModal({
    valorTotal: s.valor_total,
    clienteId: s.cliente_id,
    servicoId: s.id,
    descricao: `OS #${String(s.id).slice(0, 8)} — ${s.tipo_servico || 'Serviço'}`,
  })

  const changeStatus = async (e) => {
    e.preventDefault()
    const newStatus = e.target.status.value
    await supabase
      .from('servicos')
      .update({ status: newStatus, data_conclusao: newStatus === 'concluido' ? new Date().toISOString() : null })
      .eq('id', statusModal.id)
      .eq('user_id', user.id)
    setStatusModal(null)
    load()
  }

  return (
    <div>
      <h2 className="page-title">Serviços</h2>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar serviço..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova OS</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>OS</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Total</th><th style={{ width: 90 }}>Ações</th></tr>
            </thead>
            <tbody>
              {servicos.length === 0 && (
                <tr><td colSpan={6} className="text-center">Nenhum serviço encontrado</td></tr>
              )}
              {servicos.filter((s) => `${s.clientes?.nome} ${s.equipamentos?.tipo}`.toLowerCase().includes(search.toLowerCase())).map((s) => (
                <tr key={s.id}>
                  <td>#{String(s.id).slice(0, 8)}</td>
                  <td>{s.clientes?.nome || '-'}</td>
                  <td>{s.equipamentos?.tipo || ''} {s.equipamentos?.marca || ''}</td>
                  <td><span className={`badge badge-${statusMap[s.status] || 'aberto'}`}>{s.status}</span></td>
                  <td>{formatMoney(s.valor_total)}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(s)}>Editar</button>
                    <button className="btn btn-sm btn-success" onClick={() => showPecas(s)}>Peças</button>
                    <button className="btn btn-sm btn-warning" onClick={() => showStatus(s)}>Status</button>
                    {(s.status === 'concluido' || s.status === 'entregue') && s.valor_total > 0 && (
                      <button className="btn btn-sm btn-success" onClick={() => showPagamento(s)}>Receber</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form OS */}
      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Cliente *</label>
                    <select required value={form.cliente_id} onChange={(e) => handleClienteChange(e.target.value)}>
                      <option value="">Selecione...</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Equipamento *</label>
                    <select required value={form.equipamento_id} onChange={(e) => setForm({ ...form, equipamento_id: e.target.value })}>
                      <option value="">Selecione...</option>
                      {equipOptions.map((e) => <option key={e.id} value={e.id}>{e.tipo} {e.marca} {e.modelo}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Serviço</label>
                    <select value={form.tipo_servico} onChange={(e) => setForm({ ...form, tipo_servico: e.target.value })}>
                      <option value="">Selecione...</option>
                      {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Relato</label>
                    <select value={form.relato} onChange={(e) => setForm({ ...form, relato: e.target.value })}>
                      <option value="">Selecione...</option>
                      {RELATOS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição do Problema</label>
                  <textarea value={form.descricao_problema} onChange={(e) => setForm({ ...form, descricao_problema: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Descrição do Serviço</label>
                  <textarea value={form.descricao_servico} onChange={(e) => setForm({ ...form, descricao_servico: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Valor Mão de Obra</label>
                  <MoneyInput value={form.valor_mao_obra} onChange={(v) => setForm({ ...form, valor_mao_obra: v })} />
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

      {/* Peças */}
      {pecasModal && (
        <PecasModal
          data={pecasModal}
          onClose={() => setPecasModal(null)}
        />
      )}

      {/* Status */}
      {statusModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStatusModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Alterar Status</h3>
              <button className="modal-close" onClick={() => setStatusModal(null)}>&times;</button>
            </div>
            <form onSubmit={changeStatus}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" defaultValue={statusModal.status}>
                    {Object.keys(statusMap).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Alterar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagamento */}
      {pagamentoModal && (
        <PagamentoModal
          valorTotal={pagamentoModal.valorTotal}
          clienteId={pagamentoModal.clienteId}
          servicoId={pagamentoModal.servicoId}
          descricao={pagamentoModal.descricao}
          onClose={() => setPagamentoModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

function PecasModal({ data, onClose }) {
  const { user } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ descricao: '', quantidade: 1, valor_unitario: 0 })
  const servicoId = data.servico.id

  const reloadPecas = () => data.loadPecas(servicoId)

  const addPeca = async (e) => {
    e.preventDefault()
    const vTotal = form.quantidade * form.valor_unitario
    await supabase.from('servico_pecas').insert({
      servico_id: servicoId, user_id: user.id,
      descricao: form.descricao, quantidade: form.quantidade,
      valor_unitario: form.valor_unitario, valor_total: vTotal,
    })
    recomputeTotal()
    setAddOpen(false)
    setForm({ descricao: '', quantidade: 1, valor_unitario: 0 })
    reloadPecas()
  }

  const recomputeTotal = async () => {
    const { data: pecas } = await supabase.from('servico_pecas').select('valor_total').eq('servico_id', servicoId)
    const { data: sv } = await supabase.from('servicos').select('valor_mao_obra').eq('id', servicoId).single()
    const total = (sv?.valor_mao_obra || 0) + (pecas || []).reduce((s, p) => s + (p.valor_total || 0), 0)
    await supabase.from('servicos').update({ valor_total: total }).eq('id', servicoId)
    data.refresh()
  }

  const removePeca = async (id) => {
    if (!confirm('Excluir esta peça?')) return
    await supabase.from('servico_pecas').delete().eq('id', id)
    recomputeTotal()
    reloadPecas()
  }

  const pecas = data.pecas
  const total = (pecas || []).reduce((s, p) => s + (p.valor_total || 0), 0)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Peças — OS #{String(servicoId).slice(0, 8)}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="toolbar">
            <strong>Total peças: {formatMoney(total)}</strong>
            <button className="btn btn-sm btn-success" onClick={() => setAddOpen(true)}>+ Add Peça</button>
          </div>
          <table className="table">
            <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {(pecas || []).length === 0 && <tr><td colSpan={5} className="text-center">Nenhuma peça</td></tr>}
              {(pecas || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.descricao}</td>
                  <td>{p.quantidade}</td>
                  <td>{formatMoney(p.valor_unitario)}</td>
                  <td>{formatMoney(p.valor_total)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removePeca(p.id)}>Excluir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {addOpen && (
          <form onSubmit={addPeca}>
            <div className="modal-body" style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
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
