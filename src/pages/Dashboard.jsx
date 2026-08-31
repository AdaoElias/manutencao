import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../lib/format'
import { Link } from 'react-router-dom'

const statusMap = { aberto: 'aberto', andamento: 'andamento', concluido: 'concluido', entregue: 'entregue' }

export default function Dashboard() {
  const { user } = useAuth()
  const [counts, setCounts] = useState({ clientes: 0, equipamentos: 0, servicos: 0, garantias: 0 })
  const [finance, setFinance] = useState({ recebido: 0, pendente: 0, atrasado: 0 })
  const [servicos, setServicos] = useState([])
  const [garantias, setGarantias] = useState([])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const load = async () => {
    const uid = user.id
    const [c, e, s, g, pg] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('equipamentos').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase
        .from('servicos')
        .select('id, cliente_id, status, valor_total, clientes(nome)', { count: 'exact' })
        .eq('user_id', uid)
        .in('status', ['aberto', 'andamento'])
        .order('created_at', { ascending: false }),
      supabase
        .from('garantias')
        .select('id, data_fim, equipamentos(tipo, marca)', { count: 'exact' })
        .eq('user_id', uid)
        .gte('data_fim', new Date().toISOString().split('T')[0])
        .order('data_fim', { ascending: true }),
      supabase.from('pagamentos').select('status, valor_total, valor_pago').eq('user_id', uid),
    ])
    setCounts({ clientes: c.count, equipamentos: e.count, servicos: s.count, garantias: g.count })
    setServicos(s.data ?? [])
    setGarantias(g.data ?? [])

    const pags = pg.data ?? []
    const recebido = pags.filter((p) => p.status === 'pago').reduce((sum, p) => sum + (p.valor_total || 0), 0)
    const pendente = pags.filter((p) => p.status === 'pendente').reduce((sum, p) => sum + (p.valor_pago || 0), 0)
    const atrasado = pags.filter((p) => p.status === 'atrasado').reduce((sum, p) => sum + (p.valor_pago || 0), 0)
    setFinance({ recebido, pendente, atrasado })
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      <div className="dashboard-grid">
        <div className="card">
          <div style={{ fontSize: 28 }}>👤</div>
          <div>
            <span className="card-number">{counts.clientes}</span>
            <span className="card-label">Clientes</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28 }}>💻</div>
          <div>
            <span className="card-number">{counts.equipamentos}</span>
            <span className="card-label">Equipamentos</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28 }}>🔧</div>
          <div>
            <span className="card-number">{counts.servicos}</span>
            <span className="card-label">Serviços Abertos</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28 }}>🛡️</div>
          <div>
            <span className="card-number">{counts.garantias}</span>
            <span className="card-label">Garantias Ativas</span>
          </div>
        </div>
      </div>

      <h3 style={{ margin: '0 0 12px', color: '#555' }}>Financeiro</h3>
      <div className="dashboard-grid">
        <div className="card">
          <div style={{ fontSize: 28 }}>✅</div>
          <div>
            <span className="card-number" style={{ color: '#28a745' }}>{formatMoney(finance.recebido)}</span>
            <span className="card-label">Recebido</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28 }}>⏳</div>
          <div>
            <span className="card-number" style={{ color: '#ffc107' }}>{formatMoney(finance.pendente)}</span>
            <span className="card-label">A Receber (Pendente)</span>
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div>
            <span className="card-number" style={{ color: '#dc3545' }}>{formatMoney(finance.atrasado)}</span>
            <span className="card-label">Atrasados</span>
          </div>
        </div>
        <div className="card" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Link to="/contas" className="btn btn-primary">Ver Contas a Receber →</Link>
        </div>
      </div>

      <div className="dashboard-list">
        <div className="card">
          <h3>Últimos Serviços</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Cliente</th><th>Status</th><th>Total</th></tr>
              </thead>
              <tbody>
                {servicos.length === 0 && (
                  <tr><td colSpan={3} className="text-center">Nenhum serviço</td></tr>
                )}
                {servicos.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td>{s.clientes?.nome || '-'}</td>
                    <td>
                      <span className={`badge badge-${statusMap[s.status] || 'aberto'}`}>{s.status}</span>
                    </td>
                    <td>{formatMoney(s.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Garantias a Vencer</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Equipamento</th><th>Vencimento</th></tr>
              </thead>
              <tbody>
                {garantias.length === 0 && (
                  <tr><td colSpan={2} className="text-center">Nenhuma garantia</td></tr>
                )}
                {garantias.slice(0, 5).map((g) => (
                  <tr key={g.id}>
                    <td>{g.equipamentos?.tipo || '-'} {g.equipamentos?.marca || ''}</td>
                    <td>{formatDate(g.data_fim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
