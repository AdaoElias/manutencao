export function formatMoney(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return 'R$ 0,00'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoney(text) {
  if (text === null || text === undefined || text === '') return 0
  if (typeof text === 'number') return text
  const cleaned = String(text)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function formatDate(d) {
  if (!d) return '-'
  return new Date(d.split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR')
}
