import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

// Dummy user for UI demonstration
const DUMMY_USER = {
  id: 1,
  username: 'raghavsharma',
  email: 'raghav@example.com',
  avatar: null,
  karma: 4823,
  joined: '2024-01-15',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup'

  const openLogin = () => { setAuthMode('login'); setShowAuthModal(true) }
  const openSignup = () => { setAuthMode('signup'); setShowAuthModal(true) }
  const closeAuth = () => setShowAuthModal(false)

  // Simulate login
  const login = (credentials) => {
    setUser(DUMMY_USER)
    setShowAuthModal(false)
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout, showAuthModal, authMode, openLogin, openSignup, closeAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
