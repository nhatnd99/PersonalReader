import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth.js'
import '../../features/library/styles/library.css'

const NAV_ITEMS = [
  { to: '/', label: 'My Library', icon: '📚', end: true },
  { to: '/history', label: 'Reading History', icon: '🕒' },
  { to: '/vocabulary', label: 'Vocabulary', icon: '📝', badge: 'Soon' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

const PAGE_TITLES = {
  '/': 'My Library',
  '/history': 'Reading History',
  '/vocabulary': 'Vocabulary',
  '/settings': 'Settings',
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const pageTitle = PAGE_TITLES[location.pathname] || 'ReadFlow'
  const initials = (user?.displayName || user?.email || 'U')[0].toUpperCase()

  return (
    <div className="rf-shell">
      {/* Mobile / Tablet Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="rf-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`rf-sidebar ${drawerOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="rf-sidebar-brand">
          <span style={{ fontSize: '1.5rem' }}>📖</span>
          <div>
            <div className="rf-brand-title">ReadFlow</div>
            <div className="rf-brand-subtitle">Personal Reader</div>
          </div>
          <button
            type="button"
            className="rf-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
          >
            ×
          </button>
        </div>

        <nav className="rf-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) => `rf-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="rf-nav-icon">{item.icon}</span>
              <span className="rf-nav-label">{item.label}</span>
              {item.badge && <span className="rf-nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="rf-sidebar-footer">
          <div className="rf-sidebar-user">
            <div className="rf-avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="rf-sidebar-username">{user?.displayName || 'Reader'}</div>
              <div className="rf-sidebar-email">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="rf-content-wrapper">
        <header className="rf-header">
          <div className="rf-header-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <button
                type="button"
                className="rf-menu-btn"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
              >
                ☰
              </button>
              <h1 className="rf-header-title">{pageTitle}</h1>
            </div>

            <div className="rf-user-actions" style={{ position: 'relative' }}>
              <button
                type="button"
                className="rf-user-menu-trigger"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <div className="rf-avatar">{initials}</div>
                <span className="rf-user-name">{user?.displayName || 'Reader'}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>▼</span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 110 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="rf-user-dropdown" role="menu">
                    <div className="rf-user-dropdown-info">
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                        {user?.displayName || 'Reader'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                        {user?.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="rf-user-dropdown-logout"
                      onClick={() => {
                        setUserMenuOpen(false)
                        logout()
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="rf-main">{children}</main>
      </div>
    </div>
  )
}
