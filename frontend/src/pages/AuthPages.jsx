import { Link, useNavigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'

export function LoginPage() {
  const { user, openLogin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
    else openLogin()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Link to="/" className="flex items-center gap-2 justify-center">
          <div className="w-8 h-8 bg-flame-500 rounded-lg flex items-center justify-center">
            <Flame size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">news<span className="text-flame-500">verse</span></span>
        </Link>
      </div>
    </div>
  )
}

export function SignupPage() {
  const { user, openSignup } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
    else openSignup()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Link to="/" className="flex items-center gap-2 justify-center">
          <div className="w-8 h-8 bg-flame-500 rounded-lg flex items-center justify-center">
            <Flame size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">news<span className="text-flame-500">verse</span></span>
        </Link>
      </div>
    </div>
  )
}
