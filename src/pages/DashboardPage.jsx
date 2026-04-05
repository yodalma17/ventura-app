import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const dashboardContent = {
  es: {
    welcome: 'Hola',
    subtitle:
      'Desde aquí puedes ver tus pagos, acceder a tus trámites o comprar uno nuevo. La compra y los pagos online están desactivados. Temporalmente para tu usuario.',
    changePassword: 'Modificar contraseña',
    videoTitle: 'Vídeo informativo',
    videoSubtitle: 'Consulta aquí el vídeo explicativo sin salir del portal',
    videoLabel: 'Portal Cliente - Ventura Extranjeria Abogados',
    alert1Title: 'Pagos pendientes',
    alert1Text:
      'Si ya realizaste una reserva previamente, puede que veas un pago pendiente. PAGOS PENDIENTES en amarillo. Si no aparece ese aviso, dirige directamente a comprar el trámite. En ambos casos, el dinero no adelantado se descontará automáticamente en el momento del pago final.',
    alert2Title: 'Documentación requerida',
    alert2Text:
      'Para poder subir la documentación requerida, es necesario haber abonado el trámite completo.',
    alert3Title: 'Familias adicionales',
    alert3Text:
      'Para añadir familiares adicionales del expediente, también es necesario el pago completo del trámite correspondiente.',
    pendingPayments: 'Pagos pendientes',
    myProcedures: 'Mis trámites',
    activeProcedures: 'trámites activos',
    reserves: 'Reservas y pagos',
    noPending: 'Sin pagos pendientes',
    consultPayment: 'Consulta el estado economico de tus reservas y tramites.',
    logout: 'Cerrar sesión',
    noPaymentAlert: '¿Crees que el importe total que has pagado no es correcto?',
    contactUsNow: 'Escríbenos y lo revisaremos de inmediato',
    loading: 'Cargando dashboard...',
    testCases: 'Casos de prueba del usuario demo',
    amountPending: 'Pendiente',
    amountPaid: 'Pagado',
    missingDocuments: 'Documentos pendientes',
    additionalFamily: 'Familiares añadidos',
    procedureTimeline: 'Estado de tus expedientes',
    cardProceduresDesc: 'Accede a tus expedientes, pagos y documentación centralizada.',
    uploadDocuments: 'Subir documentos',
    payNow: 'Pagar ahora',
    stripePending:
      'Este botón debe vincularse con Stripe antes de habilitar el cobro online.',
    uploadReady: 'Archivo preparado para subida. Falta conectar este flujo con el backend.',
    uploadMissing: 'Selecciona al menos un archivo para continuar.',
    proceduresUnit: 'trámite(s)',
    proceduresFamily: 'trámite(s) con familias',
    uploadedDocsTitle: 'Archivos subidos',
    uploadedDocsDesc: 'Documentos guardados temporalmente en el proyecto local.',
    noDocsUploaded: 'Aún no has subido documentos.',
    viewFile: 'Ver archivo',
    deleteFile: 'Eliminar',
    myProfile: 'Mi perfil',
  },
  en: {
    welcome: 'Hello',
    subtitle:
      'From here you can view your payments, access your cases or purchase a new one. Online purchase and payments are currently disabled.',
    changePassword: 'Change password',
    videoTitle: 'Informational Video',
    videoSubtitle: 'View the explanatory video without leaving the portal',
    videoLabel: 'Client Portal - Ventura Immigration Lawyers',
    alert1Title: 'Pending payments',
    alert1Text:
      'If you made a reservation before, you may see a pending payment. PENDING PAYMENTS in yellow. If this alert does not appear, proceed directly to purchase the service. In both cases, the advanced money will be automatically discounted at the final payment.',
    alert2Title: 'Required documentation',
    alert2Text: 'To upload the required documentation, it is necessary to have paid the complete service.',
    alert3Title: 'Additional family members',
    alert3Text:
      'To add additional family members to the case, the complete payment for the corresponding service is also required.',
    pendingPayments: 'Pending payments',
    myProcedures: 'My procedures',
    activeProcedures: 'active procedures',
    reserves: 'Reservations and payments',
    noPending: 'No pending payments',
    consultPayment: 'Check the economic status of your reservations and cases.',
    logout: 'Sign out',
    noPaymentAlert: 'Do you think the total amount you paid is incorrect?',
    contactUsNow: 'Write to us and we will review it immediately',
    loading: 'Loading dashboard...',
    testCases: 'Demo user test cases',
    amountPending: 'Pending',
    amountPaid: 'Paid',
    missingDocuments: 'Missing documents',
    additionalFamily: 'Added family members',
    procedureTimeline: 'Case status overview',
    cardProceduresDesc: 'Access your files, payments and documentation in one place.',
    uploadDocuments: 'Upload documents',
    payNow: 'Pay now',
    stripePending:
      'This button must be connected to Stripe before enabling online payments.',
    uploadReady: 'Files prepared for upload. This flow still needs backend integration.',
    uploadMissing: 'Select at least one file to continue.',
    proceduresUnit: 'procedure(s)',
    proceduresFamily: 'procedure(s) with families',
    uploadedDocsTitle: 'Uploaded files',
    uploadedDocsDesc: 'Documents saved temporarily in the local project.',
    noDocsUploaded: 'You have not uploaded any documents yet.',
    viewFile: 'View file',
    deleteFile: 'Delete',
    myProfile: 'My profile',
  },
}

function DashboardPage({ language = 'es', onLanguageChange = () => {} }) {
  const t = dashboardContent[language] ?? dashboardContent.es
  const [user, setUser] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState(null)
  const [busyDocumentId, setBusyDocumentId] = useState(null)
  const uploadInputsRef = useRef({})
  const navigate = useNavigate()
  const apiBase = import.meta.env.VITE_API_URL || '/api'

  const requestApi = async (endpoint, options = {}) => {
    const makeRequest = async (baseUrl) => {
      const response = await fetch(`${baseUrl}${endpoint}`, options)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Request failed.')
      }

      return data
    }

    try {
      return await makeRequest(apiBase)
    } catch (error) {
      const isNetworkFailure = error instanceof TypeError

      if (!isNetworkFailure || apiBase !== '/api') {
        throw error
      }

      return makeRequest('http://localhost:4000/api')
    }
  }

  const syncDashboardData = (nextDashboardData) => {
    setDashboardData(nextDashboardData)
    window.localStorage.setItem('ventura-dashboard-data', JSON.stringify(nextDashboardData || null))
  }

  const loadDashboardData = async (userId, fallbackData = null) => {
    try {
      const freshDashboardData = await requestApi(`/dashboard?userId=${userId}`)
      syncDashboardData(freshDashboardData)
      return freshDashboardData
    } catch (_error) {
      if (fallbackData) {
        syncDashboardData(fallbackData)
        return fallbackData
      }

      throw _error
    }
  }

  const buildFileUrl = (fileName) => {
    const safePath = fileName
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')

    return fileName.includes('/')
      ? `${apiBase}/uploads/${safePath}`
      : `${apiBase}/docs/${safePath}`
  }

  useEffect(() => {
    const authUser = window.localStorage.getItem('ventura-auth-user')
    const storedDashboardData = window.localStorage.getItem('ventura-dashboard-data')

    if (!authUser) {
      navigate('/login')
      return
    }

    try {
      const userData = JSON.parse(authUser)
      setUser(userData)
      const parsedStoredDashboardData = storedDashboardData ? JSON.parse(storedDashboardData) : null

      loadDashboardData(userData.id, parsedStoredDashboardData)
        .finally(() => {
          setLoading(false)
        })
    } catch (error) {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    if (!actionMessage) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setActionMessage(null)
    }, 10000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [actionMessage])

  const handleLogout = () => {
    window.localStorage.removeItem('ventura-auth-user')
    window.localStorage.removeItem('ventura-dashboard-data')
    navigate('/login')
  }

  const handlePayClick = (title) => {
    setActionMessage({
      type: 'info',
      message: `${title}: ${t.stripePending}`,
    })
  }

  const handleUploadDocument = async (documentId, title, files) => {
    if (!user) {
      return
    }

    if (!files || files.length === 0) {
      setActionMessage({ type: 'error', message: t.uploadMissing })
      return
    }

    const [file] = files
    const formData = new FormData()
    formData.append('userId', String(user.id))
    formData.append('file', file)

    try {
      setBusyDocumentId(documentId)
      const result = await requestApi(`/documents/${documentId}/upload`, {
        method: 'POST',
        body: formData,
      })
      syncDashboardData(result.dashboardData)
      setActionMessage({
        type: 'success',
        message: `${title}: ${file.name}. ${t.uploadReady}`,
      })
    } catch (error) {
      setActionMessage({ type: 'error', message: error.message })
    } finally {
      setBusyDocumentId(null)
      if (uploadInputsRef.current[documentId]) {
        uploadInputsRef.current[documentId].value = ''
      }
    }
  }

  const handleDeleteDocument = async (documentId, title) => {
    if (!user) {
      return
    }

    try {
      setBusyDocumentId(documentId)
      const result = await requestApi(`/documents/${documentId}/file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })
      syncDashboardData(result.dashboardData)
      setActionMessage({
        type: 'success',
        message: `${title}: archivo eliminado. Ya puedes subir otro.`,
      })
    } catch (error) {
      setActionMessage({ type: 'error', message: error.message })
    } finally {
      setBusyDocumentId(null)
    }
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <main className="dashboard-page dashboard-loading-page">
        <div className="dashboard-loading-card wow animate__animated animate__fadeInUp">
          <p>{t.loading}</p>
        </div>
      </main>
    )
  }

  const renderAlerts = () => {
    if (!dashboardData) return null

    const { procedures } = dashboardData
    const pendingPaymentProcs = procedures.filter((p) => p.payment_status === 'pending')
    const pendingDocsProcs = procedures.filter((p) => p.documentation?.some((d) => d.status === 'pending'))
    const familiesProcs = procedures.filter((p) => p.family_members?.length > 0)

    return {
      hasPendingPayments: pendingPaymentProcs.length > 0,
      hasPendingDocs: pendingDocsProcs.length > 0,
      hasFamilies: familiesProcs.length > 0,
      pendingPaymentCount: pendingPaymentProcs.length,
      pendingDocsCount: pendingDocsProcs.length,
      familiesCount: familiesProcs.length,
    }
  }

  const alerts = renderAlerts()
  const uploadedDocuments = dashboardData?.procedures?.flatMap((procedure) => (
    procedure.documentation
      ?.filter((document) => document.file_name)
      .map((document) => ({
        ...document,
        procedureTitle: procedure.title,
      })) || []
  )) || []

  const userInitials = user.name
    .split(' ')
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-text">Ventura</span>
          <select className="language-select" value={language} onChange={(e) => onLanguageChange(e.target.value)} aria-label="Select language">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="dashboard-user">
          <span className="user-name">{user.name.toUpperCase()}</span>
          <button className="profile-btn" onClick={() => navigate('/profile')} title={t.myProfile} aria-label={t.myProfile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <button className="logout-btn" onClick={handleLogout} title={t.logout} aria-label={t.logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <section className="dashboard-shell">
        <div className="dashboard-alert-error wow animate__animated animate__slideInDown" data-wow-delay="0.1s">
          <div className="alert-header">
            <span className="alert-icon">⚠️</span>
            <p className="alert-title">{t.noPaymentAlert}</p>
          </div>
          <button className="btn btn-alert-primary">{t.contactUsNow}</button>
        </div>

        {actionMessage && (
          <div
            className={`dashboard-action-message dashboard-action-${actionMessage.type}`}
            role="status"
            aria-live="polite"
          >
            {actionMessage.message}
          </div>
        )}

        <section className="dashboard-content">
          <div className="dashboard-welcome-card wow animate__animated animate__fadeInUp" data-wow-delay="0.15s">
            <div className="welcome-avatar">{userInitials}</div>
            <div className="welcome-content">
              <h1>
                {t.welcome}, <strong>{user.name.split(' ')[0]}</strong>
              </h1>
              <p>{t.subtitle}</p>
              <button className="btn btn-secondary">{t.changePassword}</button>
            </div>
          </div>

          <div className="dashboard-video wow animate__animated animate__fadeInUp" data-wow-delay="0.2s">
            <h2>{t.videoTitle}</h2>
            <p className="video-subtitle">{t.videoSubtitle}</p>
            <div className="video-container">
              <div className="video-placeholder">
                <svg viewBox="0 0 100 100" className="video-icon">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                  <polygon points="40,30 40,70 70,50" fill="currentColor" />
                </svg>
                <p>{t.videoLabel}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-alerts">
            {alerts?.hasPendingPayments && (
            <div className="alert-box alert-yellow wow animate__animated animate__fadeInLeft" data-wow-delay="0.25s">
              <div className="alert-number">1</div>
              <p>
                {t.alert1Title}: {alerts.pendingPaymentCount} {t.proceduresUnit}
              </p>
            </div>
            )}

            {alerts?.hasPendingDocs && (
            <div className="alert-box alert-green wow animate__animated animate__fadeInUp" data-wow-delay="0.3s">
              <div className="alert-number">2</div>
              <p>
                {t.alert2Title}: {alerts.pendingDocsCount} {t.proceduresUnit}
              </p>
            </div>
            )}

            {alerts?.hasFamilies && (
            <div className="alert-box alert-blue wow animate__animated animate__fadeInRight" data-wow-delay="0.35s">
              <div className="alert-number">3</div>
              <p>
                {t.alert3Title}: {alerts.familiesCount} {t.proceduresFamily}
              </p>
            </div>
            )}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card card-procedures wow animate__animated animate__fadeInLeft" data-wow-delay="0.4s">
              <div className="card-icon">📋</div>
              <h3>{t.myProcedures}</h3>
              <p className="card-stat">
                {dashboardData?.stats?.active_procedures ?? 0} {t.activeProcedures}
              </p>
              <p className="card-desc">{t.cardProceduresDesc}</p>
            </div>

            <div className="dashboard-card card-payments wow animate__animated animate__fadeInRight" data-wow-delay="0.45s">
              <div className="card-icon">💳</div>
              <h3>{t.reserves}</h3>
              <p className="card-stat">
                {dashboardData?.stats?.pending_payments > 0 ? `${dashboardData.stats.pending_payments} ${t.pendingPayments}` : t.noPending}
              </p>
              <p className="card-desc">{t.consultPayment}</p>
            </div>
          </div>

          <section className="dashboard-caseboard">
            <div className="section-head wow animate__animated animate__fadeInUp" data-wow-delay="0.5s">
              <h2>{t.testCases}</h2>
              <p>{t.procedureTimeline}</p>
            </div>

            <div className="dashboard-case-grid">
              {dashboardData?.alerts?.pendingPayments?.map((item, index) => (
                <article
                  key={`payment-${item.id}`}
                  className="dashboard-case-card case-card-payment wow animate__animated animate__fadeInUp"
                  data-wow-delay={`${0.55 + index * 0.05}s`}
                >
                  <span className="case-tag">{t.pendingPayments}</span>
                  <h3>{item.title}</h3>
                  <div className="case-metrics">
                    <p>
                      <strong>{t.amountPaid}:</strong> {item.paidAmount} EUR
                    </p>
                    <p>
                      <strong>{t.amountPending}:</strong> {item.totalAmount - item.paidAmount} EUR
                    </p>
                  </div>
                  <div className="case-actions">
                    <button
                      type="button"
                      className="btn btn-case-action"
                      onClick={() => handlePayClick(item.title)}
                    >
                      {t.payNow}
                    </button>
                  </div>
                </article>
              ))}

              {dashboardData?.alerts?.pendingDocumentation?.map((item, index) => (
                <article
                  key={`docs-${item.id}`}
                  className="dashboard-case-card case-card-docs wow animate__animated animate__fadeInUp"
                  data-wow-delay={`${0.65 + index * 0.05}s`}
                >
                  <span className="case-tag">{t.missingDocuments}</span>
                  <h3>{item.title}</h3>
                  <ul className="case-list">
                    {item.missingDocuments.map((document) => (
                      <li key={document.id} className="case-list-item">
                        <span>{document.title}</span>
                        <input
                          ref={(element) => {
                            uploadInputsRef.current[document.id] = element
                          }}
                          type="file"
                          className="case-file-input"
                          onChange={(event) => handleUploadDocument(document.id, document.title, event.target.files)}
                        />
                        <button
                          type="button"
                          className="btn btn-case-action"
                          onClick={() => uploadInputsRef.current[document.id]?.click()}
                          disabled={busyDocumentId === document.id}
                        >
                          {busyDocumentId === document.id ? '...' : t.uploadDocuments}
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}

              {dashboardData?.alerts?.familyMembers?.map((item, index) => (
                <article
                  key={`family-${item.id}`}
                  className="dashboard-case-card case-card-family wow animate__animated animate__fadeInUp"
                  data-wow-delay={`${0.75 + index * 0.05}s`}
                >
                  <span className="case-tag">{t.additionalFamily}</span>
                  <h3>{item.title}</h3>
                  <ul className="case-list">
                    {item.members.map((member) => (
                      <li key={member.id}>
                        {member.name} · {member.relationship}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-caseboard">
            <div className="section-head wow animate__animated animate__fadeInUp" data-wow-delay="0.82s">
              <h2>{t.uploadedDocsTitle}</h2>
              <p>{t.uploadedDocsDesc}</p>
            </div>

            <div className="uploaded-docs-list">
              {uploadedDocuments.length === 0 && (
                <div className="uploaded-doc-card uploaded-doc-card-empty">
                  {t.noDocsUploaded}
                </div>
              )}

              {uploadedDocuments.map((document) => (
                <article key={`uploaded-${document.id}`} className="uploaded-doc-card">
                  <div>
                    <p className="uploaded-doc-title">{document.title}</p>
                    <p className="uploaded-doc-procedure">{document.procedureTitle}</p>
                  </div>
                  <div className="uploaded-doc-actions">
                    <a
                      href={buildFileUrl(document.file_name)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-case-action"
                    >
                      {t.viewFile}
                    </a>
                    <button
                      type="button"
                      className="btn btn-case-action btn-case-delete"
                      onClick={() => handleDeleteDocument(document.id, document.title)}
                      disabled={busyDocumentId === document.id}
                    >
                      {busyDocumentId === document.id ? '...' : t.deleteFile}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}

export default DashboardPage
