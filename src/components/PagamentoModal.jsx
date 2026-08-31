import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import MoneyInput from './MoneyInput'

const TIPOS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'pix', label: 'PIX' },
  { value: 'parcelado', label: 'Parcelado' },
]

export default function PagamentoModal({ valorTotal, clienteId, servicoId, vendaId, descricao, onClose, onSaved }) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState('dinheiro')
  const [valorPago, setValorPago] = useState(valorTotal || 0)
  const [parcelas, setParcelas] = useState(1)
  const [dataVencimento, setDataVencimento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)

  const valorParcela = parcelas > 0 ? valorPago / parcelas : valorPago

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const status = tipo === 'parcelado' ? 'pendente' : 'pago'
      const valorParcelaCalc = tipo === 'parcelado' ? valorPago / parcelas : valorPago

      const { error } = await supabase.from('pagamentos').insert({
        user_id: user.id,
        cliente_id: clienteId || null,
        servico_id: servicoId || null,
        venda_id: vendaId || null,
        tipo,
        valor_total: valorPago,
        valor_pago: tipo === 'parcelado' ? valorParcelaCalc : valorPago,
        parcelas_total: tipo === 'parcelado' ? parcelas : 1,
        parcelas_pagas: tipo === 'parcelado' ? 1 : 1,
        data_vencimento: dataVencimento || null,
        descricao: descricao || null,
        observacoes,
        status,
      })

      if (error) throw error
      onSaved?.()
      onClose()
    } catch (err) {
      alert('Erro ao salvar pagamento: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Registrar Pagamento</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="card" style={{ background: '#f0f7ff', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#555' }}>Valor Total</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>{formatMoney(valorTotal)}</div>
            </div>

            <div className="form-group">
              <label>Tipo de Pagamento *</label>
              <select required value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Valor a Receber *</label>
              <MoneyInput value={valorPago} onChange={setValorPago} />
            </div>

            {tipo === 'parcelado' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nº de Parcelas *</label>
                    <input type="number" min="2" max="48" required value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value) || 2)} />
                  </div>
                  <div className="form-group">
                    <label>Valor da Parcela</label>
                    <input disabled value={formatMoney(valorParcela)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Data de Vencimento (1ª parcela)</label>
                  <input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar Pagamento'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
