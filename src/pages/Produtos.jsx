import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import MoneyInput from '../components/MoneyInput'

export default function Produtos() {
  const { user } = useAuth()
  const [produtos, setProdutos] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: null, nome: '', descricao: '', preco_venda: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .eq('user_id', user.id)
      .order('nome')
    setProdutos(data ?? [])
  }

  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = produtos.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()))

  const openEdit = (p) => {
    setForm({ id: p.id, nome: p.nome, descricao: p.descricao || '', preco_venda: p.preco_venda })
    setOpen(true)
  }

  const openNew = () => {
    setForm({ id: null, nome: '', descricao: '', preco_venda: 0 })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) {
        await supabase
          .from('produtos')
          .update({ nome: form.nome, descricao: form.descricao, preco_venda: form.preco_venda })
          .eq('id', form.id)
          .eq('user_id', user.id)
      } else {
        await supabase.from('produtos').insert({
          user_id: user.id,
          nome: form.nome,
          descricao: form.descricao,
          preco_venda: form.preco_venda,
        })
      }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('produtos').delete().eq('id', id).eq('user_id', user.id)
    load()
  }

  return (
    <div>
      <h2 className="page-title">Produtos</h2>
      <div className="toolbar">
        <div className="search-box">
          <input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Produto</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Descrição</th><th>Preço Venda</th><th style={{ width: 100 }}>Ações</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center">Nenhum produto encontrado</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.nome}</strong></td>
                  <td>{p.descricao || '-'}</td>
                  <td>{formatMoney(p.preco_venda)}</td>
                  <td className="actions">
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
              <h3>{form.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button className="modal-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome *</label>
                  <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Preço de Venda</label>
                  <MoneyInput
                    value={form.preco_venda}
                    onChange={(v) => setForm({ ...form, preco_venda: v })}
                  />
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
