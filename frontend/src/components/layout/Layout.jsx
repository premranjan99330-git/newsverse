import Navbar from './Navbar'
import CategoryNav from './CategoryNav'
import Sidebar from './Sidebar'
import AuthModal from '../ui/AuthModal'
import { useAuth } from '../../context/AuthContext'

export default function Layout({ children, showSidebar = true, showCategoryNav = true }) {
  const { showAuthModal } = useAuth()

  return (
    <div className="min-h-screen">
      <Navbar />
      {showCategoryNav && <CategoryNav />}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {showSidebar ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div>{children}</div>
            <Sidebar />
          </div>
        ) : (
          children
        )}
      </main>

      {showAuthModal && <AuthModal />}
    </div>
  )
}
