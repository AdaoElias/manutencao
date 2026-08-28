import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Clientes() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, nome: '', telefone: '', email: '', endereco: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome')
    setClientes(data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clientes.filter((c) =>
    `${c.nome} ${c.telefone}`.toLowerCase().includes(search.toLowerCase())
  )

  const openEdit = (c) => {
    setForm({ id: c.id, nome: c.nome, telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '' })
    setOpen(true)
  }

  const openNew = () => {
    setForm({ id: null, nome: '', telefone: '', email: '', endereco: '' })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) {
        await supabase
          .from('clientes')
          .update({ nome: form.nome, telefone: form.telefone, email: form.email, endereco: form.endereco })
          .eq('id', form.id)
          .eq('user_id', user.id)
      } else {
        await supabase.from('clientes').insert({ user_id: user.id, nome: form.nome, telefone: form.telefone, email: form.email, endereco: form.endereco })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  return (
    <div>
      <h2 className="page-title">Clientes</h2>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Cliente</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Endereço</th><th style={{ width: 100 }}>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center">Nenhum cliente encontrado</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong></td>
                  <td>{c.telefone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.endereco || '-'}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Excluir</button>
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
              <h3>{form.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome *</label>
                  <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Telefone</label>
                    <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Endereço</label>
                  <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
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
