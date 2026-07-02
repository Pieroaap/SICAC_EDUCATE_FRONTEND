import { ChevronDown, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoWhite from '../assets/brand/logo-white.png';
import { getNavigationGroups } from '../app/navigation';
import { useTheme } from '../app/ThemeProvider';
import { Button } from '../components/ui/Button';
import { useAuth } from '../features/auth/AuthProvider';
import { cn } from '../lib/cn';

export function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Identidad: true });
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { profile, logout } = useAuth();
  const roleCodes = profile?.roles.map((role) => role.codigo) ?? [];
  const navigationGroups = getNavigationGroups(roleCodes);
  const activeGroupLabel = navigationGroups.find((group) => (
    group.label !== 'Espacio de trabajo'
    && group.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
  ))?.label;
  const isGroupOpen = (label: string) => openGroups[label] ?? activeGroupLabel === label;

  return (
    <div className="workspace">
      <button
        aria-label="Cerrar navegación"
        className={cn('workspace-overlay', menuOpen && 'is-open')}
        onClick={() => setMenuOpen(false)}
        type="button"
      />
      <aside className={cn('sidebar', menuOpen && 'is-open')}>
        <div className="sidebar__brand">
          <img alt="Club de Arte & Cultura" src={logoWhite} />
          <button
            aria-label="Cerrar menú"
            className="sidebar__mobile-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="sidebar__nav">
          {navigationGroups.map((group) => (
            <div className="sidebar__group" key={group.label}>
              {group.label === 'Espacio de trabajo' ? <p>{group.label}</p> : (
                <button
                  aria-expanded={isGroupOpen(group.label)}
                  className="sidebar__group-toggle"
                  onClick={() => setOpenGroups((current) => ({
                    ...current,
                    [group.label]: !(current[group.label] ?? activeGroupLabel === group.label),
                  }))}
                  type="button"
                >
                  <span>{group.label}</span>
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              )}
              {(group.label === 'Espacio de trabajo' || isGroupOpen(group.label)) ? (
                <div className="sidebar__group-items">
                  {group.items.map((item) => (
                    <NavLink
                      className={({ isActive }) => cn('sidebar__link', isActive && 'is-active')}
                      end={item.to === '/'}
                      key={item.to}
                      onClick={() => setMenuOpen(false)}
                      to={item.to}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="sidebar__profile">
          <div className="profile-row">
            <span className="profile-avatar" aria-hidden="true">
              {profile?.nombres.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{profile?.nombreCompleto}</strong>
              <span>{profile?.roles.map((role) => role.nombre).join(' · ')}</span>
            </div>
          </div>
          <div className="sidebar__actions">
            <button
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
              onClick={toggleTheme}
              type="button"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button aria-label="Cerrar sesión" onClick={logout} type="button">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-header">
          <Button
            aria-label="Abrir navegación"
            className="mobile-menu-button"
            onClick={() => setMenuOpen(true)}
            variant="ghost"
          >
            <Menu size={20} />
          </Button>
          <div>
            <span>SICAC</span>
            <p>Sistema Integral del Club de Arte & Cultura</p>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
