import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Gift, TicketCheck, Trophy, PanelsTopLeft, History, Sun, Moon, Info, LayoutDashboard } from 'lucide-react'
import { Toaster } from 'sonner'

const logo = new URL('../assets/radiosync-logo.svg', import.meta.url).href
const themeKey = 'radiosync.desktop.theme'
type Theme = 'dark' | 'light'

export function initializeTheme() {
  let theme: Theme = 'dark'
  try { if (localStorage.getItem(themeKey) === 'light') theme = 'light' } catch { /* Storage may be unavailable. */ }
  document.documentElement.dataset.theme = theme
}

const groups = [
  { label: 'Operação', links: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/ouvintes', label: 'Ouvintes', icon: Users },
    { to: '/promocoes', label: 'Promoções', icon: Gift },
    { to: '/participacoes', label: 'Participações', icon: TicketCheck },
    { to: '/sorteio', label: 'Sorteio', icon: Trophy }
  ] },
  { label: 'Consulta', links: [
    { to: '/mural', label: 'Mural', icon: PanelsTopLeft },
    { to: '/historico', label: 'Histórico', icon: History },
    { to: '/sobre', label: 'Sobre', icon: Info }
  ] }
]

export default function Layout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setTheme(next)
    try { localStorage.setItem(themeKey, next) } catch { /* Keep the in-session preference. */ }
  }
  const ThemeIcon = theme === 'light' ? Sun : Moon
  return (
    <>
    <div className="studio-shell">
      <aside className="studio-rail">
        <header className="studio-brand"><img src={logo} alt="RadioSync" /><span>Console de estúdio</span></header>
        <nav aria-label="Navegação principal">
          {groups.map(group => <div role="group" aria-label={group.label} key={group.label}>
            <p className="studio-group">{group.label}</p>
            {group.links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className="studio-link"><Icon size={18} aria-hidden="true" />{label}</NavLink>
            ))}
          </div>)}
        </nav>
        <footer><button type="button" onClick={toggleTheme} aria-pressed={theme === 'light'} aria-label="Tema claro" className="studio-theme"><ThemeIcon size={17} aria-hidden="true" />Tema claro<span className="studio-switch" aria-hidden="true" /></button></footer>
      </aside>
      <main className="studio-workspace">{children}</main>
    </div>
    <Toaster position="top-right" theme={theme} richColors />
    </>
  )
}
