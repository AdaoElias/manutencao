import { useEffect, useState } from 'react'
import { parseMoney } from '../lib/format'

export default function MoneyInput({ value, onChange, required, name }) {
  const [text, setText] = useState(value ? String(value).replace('.', ',') : '')

  useEffect(() => {
    setText(value === 0 || value === null || value === undefined ? '' : String(value).replace('.', ','))
  }, [value])

  const handleChange = (e) => {
    let raw = e.target.value
    raw = raw.replace(/[^\d,]/g, '')
    if (raw.split(',').length > 2) return
    setText(raw)
    onChange(parseMoney(raw))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      name={name}
      value={text}
      onChange={handleChange}
      placeholder="0,00"
      required={required}
    />
  )
}
