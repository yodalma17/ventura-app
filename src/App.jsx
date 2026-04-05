import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'es'
  }

  const savedLanguage = window.localStorage.getItem('ventura-language')
  return savedLanguage === 'en' ? 'en' : 'es'
}

function App() {
  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    const initWow = () => {
      if (!window.WOW) {
        return
      }

      const wow = new window.WOW({
        live: false,
        mobile: true,
        offset: 40,
      })

      wow.init()
    }

    if (window.WOW) {
      initWow()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/wow/1.1.2/wow.min.js'
    script.async = true
    script.onload = initWow
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('ventura-language', language)
  }, [language])

  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage language={language} onLanguageChange={setLanguage} />}
      />
      <Route path="/login" element={<LoginPage language={language} />} />
      <Route path="/dashboard" element={<DashboardPage language={language} onLanguageChange={setLanguage} />} />
      <Route path="/profile" element={<ProfilePage language={language} />} />
      <Route path="/admin/dashboard" element={<AdminDashboard language={language} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
