import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ProfilePage.css'

const profileContent = {
  es: {
    title: 'Mi Perfil',
    subtitle: 'Actualiza tu información personal',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    phonePlaceholder: '+34 (opcional)',
    save: 'Guardar cambios',
    cancel: 'Cancelar',
    back: 'Volver',
    loading: 'Guardando...',
    success: 'Datos actualizados correctamente',
    error: 'Error al actualizar los datos',
    emailInUse: 'Este correo ya está en uso',
    invalidEmail: 'Correo electrónico inválido',
    requiredField: 'Este campo es obligatorio',
    noChanges: 'No hay cambios para guardar',
    personalInfo: 'Información Personal',
    backToDashboard: 'Volver al Dashboard',
  },
  en: {
    title: 'My Profile',
    subtitle: 'Update your personal information',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone',
    phonePlaceholder: '+34 (optional)',
    save: 'Save changes',
    cancel: 'Cancel',
    back: 'Back',
    loading: 'Saving...',
    success: 'Data updated successfully',
    error: 'Error updating data',
    emailInUse: 'This email is already in use',
    invalidEmail: 'Invalid email address',
    requiredField: 'This field is required',
    noChanges: 'No changes to save',
    personalInfo: 'Personal Information',
    backToDashboard: 'Back to Dashboard',
  },
}

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.toLowerCase())
}

function ProfilePage({ language = 'es' }) {
  const navigate = useNavigate()
  const t = profileContent[language] || profileContent.es
  const apiBase = import.meta.env.VITE_API_URL || '/api'
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [originalData, setOriginalData] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    try {
      const userStr = window.localStorage.getItem('ventura-auth-user')
      if (!userStr) {
        // eslint-disable-next-line no-console
        console.warn('[profile] Sin sesión, redirigiendo a /login')
        navigate('/login')
        return
      }

      const user = JSON.parse(userStr)
      // eslint-disable-next-line no-console
      console.log('[profile] Sesión activa:', { id: user.id, email: user.email })
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
      setOriginalData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    } catch {
      // eslint-disable-next-line no-console
      console.error('[profile] Error al parsear sesión, redirigiendo a /login')
      navigate('/login')
    }
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = t.requiredField
    }

    if (!formData.email.trim()) {
      newErrors.email = t.requiredField
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t.invalidEmail
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // eslint-disable-next-line no-console
    console.log('[profile] handleSubmit →', formData)

    if (!validateForm()) {
      // eslint-disable-next-line no-console
      console.warn('[profile] Formulario inválido')
      return
    }

    const hasChanges = Object.keys(formData).some((key) => formData[key] !== originalData[key])

    if (!hasChanges) {
      setMessage(t.noChanges)
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const userStr = window.localStorage.getItem('ventura-auth-user')
      if (!userStr) {
        setMessage(t.error)
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)

      const payload = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        }),
      }

      const doFetch = async (base) => {
        const res = await fetch(`${base}/profile/me`, payload)
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError(`Non-JSON response from ${base}`)
        }
        return res
      }

      let response
      try {
        response = await doFetch(apiBase)
      } catch (err) {
        const isNetworkFailure = err instanceof TypeError
        if (!isNetworkFailure || apiBase !== '/api') throw err
        response = await doFetch('http://localhost:4000/api')
      }

      const data = await response.json()

      if (!response.ok) {
        setMessage(response.status === 409 ? t.emailInUse : (data.message || t.error))
        setLoading(false)
        return
      }

      const updatedUser = { ...user, name: data.user.name, email: data.user.email, phone: data.user.phone }
      window.localStorage.setItem('ventura-auth-user', JSON.stringify(updatedUser))
      // eslint-disable-next-line no-console
      console.log('[profile] Perfil actualizado OK:', updatedUser.email)
      setMessage(t.success)
      setOriginalData(formData)

      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[profile] handleSubmit error:', error.message)
      setMessage(error.message || t.error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/dashboard')
  }

  return (
    <main className="profile-page">
      <header className="profile-header">
        <button
          className="profile-logo-btn"
          onClick={handleCancel}
          title={t.backToDashboard}
          aria-label={t.backToDashboard}
        >
          <span className="brand-text-header">Ventura</span>
        </button>
      </header>

      <section className="profile-container">
        <div className="profile-content">
          <div className="profile-hero">
            <div className="profile-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-title">{t.title}</h1>
              <p className="profile-subtitle">{t.subtitle}</p>
            </div>
          </div>

          {message && (
            <div className={`profile-message ${message === t.success ? 'success' : 'error'}`}>
              <span className="message-icon">
                {message === t.success ? '✓' : '✕'}
              </span>
              {message}
            </div>
          )}

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-card">
              <h2 className="form-card-title">{t.personalInfo}</h2>
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {t.name}
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${errors.name ? 'has-error' : ''}`}
                  disabled={loading}
                  required
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 5L2 7" />
                  </svg>
                  {t.email}
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'has-error' : ''}`}
                  disabled={loading}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {t.phone}
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder={t.phonePlaceholder}
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                {t.cancel}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t.loading : t.save}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export default ProfilePage
