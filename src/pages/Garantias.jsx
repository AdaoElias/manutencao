import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/format'

export default function Garantias() {
  const { user } = useAuth()
  const [garantias, setGarantias] = useState([])
  const [filtro, setFiltro] = useState('ativas')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [equipamentos, setEquipamentos] = useState([])
  const [saving, setSaving] = useState(false)

  const load = async (tipo) => {
    let q = supabase
      .from('garantias')
      .select('*, equipamentos(tipo, marca, modelo, clientes(nome))')
      .eq('user_id', user.id)
      .order('data_fim', { ascending: true })
    if (tipo === 'ativas') q = q.gte('data_fim', new Date().toISOString().split('T')[0])
    else if (tipo === 'vencidas') q = q.lt('data_fim', new Date().toISOString().split('T')[0])
    const { data } = await q
    setGarantias(data ?? [])
  }

  useEffect(() => { load(filtro) }, [user, filtro]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEquipamentos = async () => {
    const { data } = await supabase
      .from('equipamentos')
      .select('id, tipo, marca, modelo, clientes(nome)')
      .eq('user_id', user.id)
    setEquipamentos(data ?? [])
  }

  const openNew = () => {
    setForm({ id: null, equipamento_id: '', data_inicio: '', data_fim: '', descricao: '' })
    loadEquipamentos()
    setOpen(true)
  }

  const openEdit = async (g) => {
    await loadEquipamentos()
    setForm({
      id: g.id, equipamento_id: g.equipamento_id,
      data_inicio: g.data_inicio, data_fim: g.data_fim, descricao: g.descricao || '',
    })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { equipamento_id: form.equipamento_id, data_inicio: form.data_inicio, data_fim: form.data_fim, descricao: form.descricao }
      if (form.id) {
        await supabase.from('garantias').update(payload).eq('id', form.id).eq('user_id', user.id)
      } else {
        await supabase.from('garantias').insert({ user_id: user.id, ...payload })
      }
      setOpen(false)
      load(filtro)
    } finally {
      setSaving(false)
    }
  }

  const hoje = new Date()

  return (
    <div>
      <h2 className="page-title">Garantias</h2>
      <div className="toolbar">
        <div className="actions">
          <button className={`btn btn-sm ${filtro === 'todas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro('todas')}>Todas</button>
          <button className={`btn btn-sm ${filtro === 'ativas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro('ativas')}>Ativas</button>
          <button className={`btn btn-sm ${filtro === 'vencidas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro('vencidas')}>Vencidas</button>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Garantia</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Cliente</th><th>Equipamento</th><th>Início</th><th>Fim</th><th>Situação</th><th style={{ width: 60 }}>Ações</th></tr>
            </thead>
            <tbody>
              {garantias.length === 0 && (
                <tr><td colSpan={6} className="text-center">Nenhuma garantia encontrada</td></tr>
              )}
              {garantias.map((g) => {
                const venc = new Date(g.data_fim + 'T12:00:00')
                const situacao = venc >= hoje ? 'ativa' : 'vencida'
                return (
                  <tr key={g.id}>
                    <td>{g.equipamentos?.clientes?.nome || '-'}</td>
                    <td>{g.equipamentos?.tipo || ''} {g.equipamentos?.marca || ''}</td>
                    <td>{formatDate(g.data_inicio)}</td>
                    <td>{formatDate(g.data_fim)}</td>
                    <td><span className={`badge badge-${situacao}`}>{situacao}</span></td>
                    <td><button className="btn btn-sm btn-primary" onClick={() => openEdit(g)}>Editar</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{form.id ? 'Editar Garantia' : 'Nova Garantia'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Equipamento *</label>
                  <select required value={form.equipamento_id} onChange={(e) => setForm({ ...form, equipamento_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {equipamentos.map((eq) => (
                      <option key={eq.id} value={eq.id}>{eq.clientes?.nome} - {eq.tipo} {eq.marca} {eq.modelo}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data Início *</label>
                    <input type="date" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Data Fim *</label>
                    <input type="date" required value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
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
    </div>
  )
}
