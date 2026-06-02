import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sun, Moon, Bell, ChevronDown, User, LogOut, Shield, Flame, Menu, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useDebounce } from '../../hooks/useNews'
import { getInitials, formatNumber } from '../../utils/helpers'
import clsx from 'clsx'

export default function Navbar() {
  const { dark, toggle } = useTheme()
  const { user, logout, openLogin, openSignup } = useAuth()
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const navigate = useNavigate()
  const debouncedSearch = useDebounce(search, 500)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (debouncedSearch.trim()) navigate(`/search?q=${encodeURIComponent(debouncedSearch)}`)
  }, [debouncedSearch])

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-ink-200 dark:border-ink-800 bg-white/80 dark:bg-ink-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-flame-500 rounded-lg flex items-center justify-center">
            <Flame size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight hidden sm:block">
            news<span className="text-flame-500">verse</span>
          </span>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search news, topics, sources..."
              className="input pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Mobile Search Toggle */}
          <button onClick={() => setShowSearch(s => !s)} className="btn-ghost md:hidden p-2">
            <Search size={18} />
          </button>

          {/* Theme Toggle */}
          <button onClick={toggle} className="btn-ghost p-2" title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Fact Check shortcut */}
          <Link to="/factcheck" className="btn-ghost p-2 hidden sm:flex items-center gap-1.5 text-xs font-mono">
            <Shield size={15} className="text-sage-500" />
            <span className="hidden lg:block text-sage-500 font-medium">FactCheck</span>
          </Link>

          {user ? (
            <>
              <button className="btn-ghost p-2 relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-flame-500 rounded-full" />
              </button>

              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(s => !s)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-flame-500 flex items-center justify-center text-white text-xs font-display font-bold">
                    {getInitials(user.username)}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user.username}</span>
                  <ChevronDown size={14} className={clsx('transition-transform text-ink-400', showUserMenu && 'rotate-180')} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 card shadow-xl shadow-ink-200/50 dark:shadow-ink-950/80 py-1 animate-fade-in">
                    <div className="px-3 py-2 border-b border-ink-100 dark:border-ink-800">
                      <p className="text-xs text-ink-500">Karma</p>
                      <p className="font-mono font-bold text-flame-500">{formatNumber(user.karma)} pts</p>
                    </div>
                    <Link to={`/profile/${user.username}`} onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors">
                      <User size={15} className="text-ink-400" /> Profile
                    </Link>
                    <button onClick={() => { logout(); setShowUserMenu(false) }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors w-full text-left text-red-500">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={openLogin} className="btn-ghost text-sm">Log in</button>
              <button onClick={openSignup} className="btn-primary">Sign up</button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {showSearch && (
        <div className="md:hidden px-4 pb-3 animate-slide-up">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search news..."
              className="input pl-9 h-9"
            />
          </div>
        </div>
      )}
    </nav>
  )
}
