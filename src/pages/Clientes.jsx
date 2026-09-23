import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const maskPhone = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const maskCep = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

const enderecoCompleto = (c) => {
  const l1 = [c.endereco, c.bairro].filter(Boolean).join(', ')
  const l2 = [c.cidade, c.uf].filter(Boolean).join('/')
  const partes = []
  if (l1) partes.push(l1)
  if (l2) partes.push(l2)
  if (c.cep) partes.push(`CEP ${c.cep}`)
  return partes.join(' ') || '-'
}

const emptyForm = { id: null, nome: '', telefone: '', email: '', endereco: '', cep: '', bairro: '', cidade: '', uf: '' }

export default function Clientes() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

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
    setForm({
      id: c.id, nome: c.nome, telefone: c.telefone || '', email: c.email || '',
      endereco: c.endereco || '', cep: c.cep || '', bairro: c.bairro || '',
      cidade: c.cidade || '', uf: c.uf || '',
    })
    setOpen(true)
  }

  const openNew = () => {
    setForm(emptyForm)
    setOpen(true)
  }

  const buscarCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const dados = await res.json()
      if (dados.erro) {
        alert('CEP não encontrado.')
        return
      }
      setForm((f) => ({
        ...f,
        endereco: dados.logradouro || f.endereco,
        bairro: dados.bairro || f.bairro,
        cidade: dados.localidade || f.cidade,
        uf: dados.uf || f.uf,
      }))
    } catch {
      alert('Erro ao buscar o CEP. Verifique sua conexão.')
    } finally {
      setBuscandoCep(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        nome: form.nome, telefone: form.telefone, email: form.email,
        endereco: form.endereco, cep: form.cep, bairro: form.bairro,
        cidade: form.cidade, uf: form.uf,
      }
      if (form.id) {
        await supabase
          .from('clientes')
          .update(payload)
          .eq('id', form.id)
          .eq('user_id', user.id)
      } else {
        await supabase.from('clientes').insert({ user_id: user.id, ...payload })
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
                  <td>{enderecoCompleto(c)}</td>
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
                    <label>Telefone / Celular</label>
                    <input
                      inputMode="numeric"
                      placeholder="(00) 00000-0000"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>CEP</label>
                    <input
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={(e) => {
                        const cep = maskCep(e.target.value)
                        setForm({ ...form, cep })
                        if (cep.replace(/\D/g, '').length === 8) buscarCep(cep)
                      }}
                    />
                    {buscandoCep && <span className="form-hint">Buscando endereço...</span>}
                  </div>
                  <div className="form-group">
                    <label>UF</label>
                    <input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Endereço</label>
                  <input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bairro</label>
                    <input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                  </div>
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