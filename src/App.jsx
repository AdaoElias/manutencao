import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import Equipamentos from './pages/Equipamentos'
import Servicos from './pages/Servicos'
import Vendas from './pages/Vendas'
import Garantias from './pages/Garantias'
import Produtos from './pages/Produtos'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="servicos" element={<Servicos />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="garantias" element={<Garantias />} />
        <Route path="produtos" element={<Produtos />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
