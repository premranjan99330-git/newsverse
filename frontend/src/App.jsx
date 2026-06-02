import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import ArticlePage from './pages/ArticlePage'
import SearchPage from './pages/SearchPage'
import TrendingPage from './pages/TrendingPage'
import FactCheckPage from './pages/FactCheckPage'
import ProfilePage from './pages/ProfilePage'
import { LoginPage, SignupPage } from './pages/AuthPages'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/factcheck" element={<FactCheckPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
