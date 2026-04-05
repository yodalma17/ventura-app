import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { PublicClientApplication } from '@azure/msal-browser'

// Microsoft MSAL — instancia a nivel módulo
const MICROSOFT_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID
let msalInstance = null
let msalInitPromise = null
if (MICROSOFT_CLIENT_ID) {
  msalInstance = new PublicClientApplication({
    auth: {
      clientId: MICROSOFT_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID || 'consumers'}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  msalInitPromise = msalInstance.initialize()
}

const loginContent = {
  es: {
    kicker: 'Área privada',
    titleLogin: 'Inicia sesión',
    titleRegister: 'Crea tu cuenta',
    subtitleLogin: 'Accede para gestionar tus citas, documentos y seguimiento de trámites.',
    subtitleRegister: 'Regístrate para guardar tus datos temporalmente en SQLite local.',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    password: 'Contraseña',
    passwordPlaceholder: '********',
    fullName: 'Nombre completo',
    fullNamePlaceholder: 'Tu nombre y apellidos',
    confirmPassword: 'Confirmar contraseña',
    submitLogin: 'Entrar',
    submitRegister: 'Registrarme',
    forgot: 'Olvidé mi contraseña',
    back: 'Volver a inicio',
    switchToRegister: '¿No tienes cuenta? Regístrate',
    switchToLogin: '¿Ya tienes cuenta? Inicia sesión',
    socialTitle: 'O continúa con',
    withGoogle: 'Continuar con Google',
    withMicrosoft: 'Continuar con Microsoft',
    successLogin: 'Sesión iniciada correctamente.',
    successRegister: 'Registro completado correctamente.',
    errors: {
      requiredFields: 'Completa todos los campos obligatorios.',
      passwordMatch: 'Las contraseñas no coinciden.',
      socialEmail: 'Ingresa un correo válido para continuar.',
      generic: 'Ha ocurrido un error. Inténtalo de nuevo.',
    },
  },
  en: {
    kicker: 'Private area',
    titleLogin: 'Sign in',
    titleRegister: 'Create your account',
    subtitleLogin: 'Access your appointments, documents and case follow-up in one place.',
    subtitleRegister: 'Sign up to store your data temporarily in local SQLite.',
    email: 'Email',
    emailPlaceholder: 'you@email.com',
    password: 'Password',
    passwordPlaceholder: '********',
    fullName: 'Full name',
    fullNamePlaceholder: 'Your full name',
    confirmPassword: 'Confirm password',
    submitLogin: 'Log in',
    submitRegister: 'Sign up',
    forgot: 'I forgot my password',
    back: 'Back to home',
    switchToRegister: "Don't have an account? Sign up",
    switchToLogin: 'Already have an account? Sign in',
    socialTitle: 'Or continue with',
    withGoogle: 'Continue with Google',
    withMicrosoft: 'Continue with Microsoft',
    successLogin: 'Logged in successfully.',
    successRegister: 'Registered successfully.',
    errors: {
      requiredFields: 'Please complete all required fields.',
      passwordMatch: 'Passwords do not match.',
      socialEmail: 'Please enter a valid email before social login.',
      generic: 'Something went wrong. Please try again.',
    },
  },
}

function LoginPage({ language }) {
  const t = loginContent[language] ?? loginContent.es
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)
  const apiBase = import.meta.env.VITE_API_URL || '/api'

  const title = useMemo(
    () => (mode === 'login' ? t.titleLogin : t.titleRegister),
    [mode, t.titleLogin, t.titleRegister],
  )

  const subtitle = useMemo(
    () => (mode === 'login' ? t.subtitleLogin : t.subtitleRegister),
    [mode, t.subtitleLogin, t.subtitleRegister],
  )

  const saveSession = (user, dashboardData) => {
    window.localStorage.setItem('ventura-auth-user', JSON.stringify(user))
    window.localStorage.setItem('ventura-dashboard-data', JSON.stringify(dashboardData || null))
  }

  const getRedirectPath = (user) => {
    return user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  }

  const doRequest = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || t.errors.generic)
    }

    return data
  }

  const callApi = async (endpoint, payload) => {
    try {
      return await doRequest(`${apiBase}${endpoint}`, payload)
    } catch (error) {
      const isNetworkFailure = error instanceof TypeError

      if (!isNetworkFailure || apiBase !== '/api') {
        throw error
      }

      return doRequest(`http://localhost:4000/api${endpoint}`, payload)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (!email || !password || (mode === 'register' && !name)) {
      setStatus({ type: 'error', message: t.errors.requiredFields })
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setStatus({ type: 'error', message: t.errors.passwordMatch })
      return
    }

    try {
      setIsLoading(true)

      if (mode === 'register') {
        const result = await callApi('/auth/register', {
          name,
          email,
          password,
        })

        saveSession(result.user, result.dashboardData)
        setStatus({ type: 'success', message: t.successRegister })
        
        setTimeout(() => {
          navigate(getRedirectPath(result.user))
        }, 800)
        return
      }

      const result = await callApi('/auth/login', {
        email,
        password,
      })

      saveSession(result.user, result.dashboardData)
      setStatus({ type: 'success', message: t.successLogin })
      
      setTimeout(() => {
        navigate(getRedirectPath(result.user))
      }, 800)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || t.errors.generic })
    } finally {
      setIsLoading(false)
    }
  }

  const processSocialLogin = async (provider, socialEmail, socialName) => {
    try {
      setIsLoading(true)
      setStatus({ type: '', message: '' })
      const result = await callApi('/auth/social', {
        provider,
        email: socialEmail,
        name: socialName || 'Usuario',
      })
      saveSession(result.user, result.dashboardData)
      setStatus({ type: 'success', message: t.successLogin })
      setTimeout(() => navigate(getRedirectPath(result.user)), 800)
    } catch (error) {
      setStatus({ type: 'error', message: error.message || t.errors.generic })
    } finally {
      setIsLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then((r) => r.json())
        await processSocialLogin('google', userInfo.email, userInfo.name)
      } catch {
        setStatus({ type: 'error', message: t.errors.generic })
      }
    },
    onError: () => setStatus({ type: 'error', message: t.errors.generic }),
  })

  const handleMicrosoftLogin = async () => {
    if (!msalInstance) {
      setStatus({ type: 'error', message: 'Microsoft login no configurado. Añade VITE_MICROSOFT_CLIENT_ID en .env.local' })
      return
    }
    try {
      await msalInitPromise
      const result = await msalInstance.loginPopup({
        scopes: ['openid', 'profile', 'email', 'User.Read'],
      })
      await processSocialLogin('microsoft', result.account.username, result.account.name)
    } catch (error) {
      if (!error.message?.includes('user_cancelled') && !error.errorCode?.includes('user_cancelled')) {
        setStatus({ type: 'error', message: t.errors.generic })
      }
    }
  }

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true" />
      <section className="login-card animate__animated animate__fadeInUp">
        <p className="login-kicker">{t.kicker}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <label htmlFor="name">{t.fullName}</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t.fullNamePlaceholder}
                required
              />
            </>
          ) : null}

          <label htmlFor="email">{t.email}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.emailPlaceholder}
            required
          />

          <label htmlFor="password">{t.password}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t.passwordPlaceholder}
            required
          />

          {mode === 'register' ? (
            <>
              <label htmlFor="confirmPassword">{t.confirmPassword}</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t.passwordPlaceholder}
                required
              />
            </>
          ) : null}

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading} aria-label={mode === 'login' ? t.submitLogin : t.submitRegister}>
            {mode === 'login' ? (
              t.submitLogin
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                {t.submitRegister}
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>{t.socialTitle}</span>
        </div>

        <div className="social-auth-actions">
          <button
            type="button"
            className="btn social-btn social-btn-google social-btn--soon"
            disabled
            title="Próximamente — pendiente de configurar credenciales OAuth"
          >
            {t.withGoogle}
          </button>
          <button
            type="button"
            className="btn social-btn social-btn-microsoft social-btn--soon"
            disabled
            title="Próximamente — pendiente de configurar credenciales OAuth"
          >
            {t.withMicrosoft}
          </button>
        </div>

        {status.message ? (
          <p className={`auth-status ${status.type === 'error' ? 'auth-status-error' : 'auth-status-success'}`}>
            {status.message}
          </p>
        ) : null}

        <div className="login-links">
          {mode === 'login' ? (
            <>
              <a href="#">{t.forgot}</a>
              <button type="button" className="link-button" onClick={() => setMode('register')}>
                {t.switchToRegister}
              </button>
            </>
          ) : (
            <>
              <span />
              <button type="button" className="link-button" onClick={() => setMode('login')}>
                {t.switchToLogin}
              </button>
            </>
          )}
        </div>

        <div className="login-back-link">
          <Link to="/">{t.back}</Link>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
