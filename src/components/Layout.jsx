import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/clientes', label: 'Clientes', icon: '👤', end: false },
  { to: '/equipamentos', label: 'Equipamentos', icon: '💻', end: false },
  { to: '/servicos', label: 'Serviços', icon: '🔧', end: false },
  { to: '/vendas', label: 'Vendas', icon: '💰', end: false },
  { to: '/garantias', label: 'Garantias', icon: '🛡️', end: false },
  { to: '/produtos', label: 'Produtos', icon: '📦', end: false },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>TechService</h1>
          <span className="sidebar-subtitle">Gestão</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="user-email">{user?.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
