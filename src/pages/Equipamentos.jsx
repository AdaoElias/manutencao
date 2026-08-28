import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Equipamentos() {
  const { user } = useAuth()
  const [equipamentos, setEquipamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, cliente_id: '', tipo: '', marca: '', modelo: '', numero_serie: '', observacoes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [eq, cl] = await Promise.all([
      supabase.from('equipamentos').select('*, clientes(nome)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
    ])
    setEquipamentos(eq.data ?? [])
    setClientes(cl.data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = equipamentos.filter((e) =>
    [e.tipo, e.marca, e.modelo, e.clientes?.nome].join(' ').toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (e) => {
    setForm({ id: e.id, cliente_id: e.cliente_id, tipo: e.tipo, marca: e.marca || '', modelo: e.modelo || '', numero_serie: e.numero_serie || '', observacoes: e.observacoes || '' })
    setOpen(true)
  }

  const openNew = () => {
    setForm({ id: null, cliente_id: '', tipo: '', marca: '', modelo: '', numero_serie: '', observacoes: '' })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { cliente_id: form.cliente_id, tipo: form.tipo, marca: form.marca, modelo: form.modelo, numero_serie: form.numero_serie, observacoes: form.observacoes }
      if (form.id) {
        await supabase.from('equipamentos').update(payload).eq('id', form.id).eq('user_id', user.id)
      } else {
        await supabase.from('equipamentos').insert({ user_id: user.id, ...payload })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este equipamento?')) return
    await supabase.from('equipamentos').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  return (
    <div>
      <h2 className="page-title">Equipamentos</h2>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Equipamento</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Cliente</th><th>Tipo</th><th>Marca/Modelo</th><th>Nº Série</th><th style={{ width: 60 }}>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center">Nenhum equipamento encontrado</td></tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>{e.clientes?.nome || '-'}</td>
                  <td>{e.tipo}</td>
                  <td>{e.marca} {e.modelo}</td>
                  <td>{e.numero_serie || '-'}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(e)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(e.id)}>Excluir</button>
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
              <h3>{form.id ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
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
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo *</label>
                    <input required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Modelo</label>
                    <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Nº Série</label>
                    <input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
                  </div>
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
    </div>
  )
}
