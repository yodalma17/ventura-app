import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AdminDashboard.css'

const adminContent = {
  es: {
    loading: 'Cargando panel de administración...',
    title: 'Panel de Administración',
    welcome: 'Bienvenido',
    logout: 'Cerrar sesión',
    statPending: 'Pendientes',
    statReviewed: 'Revisados',
    statComplete: 'Completos',
    usersTitle: 'Gestión de Usuarios',
    noUsers: 'No hay usuarios registrados',
    colId: 'ID',
    colName: 'Nombre',
    colEmail: 'Correo',
    colStatus: 'Estado',
    colRole: 'Rol',
    colProvider: 'Proveedor',
    colDate: 'Registro',
    colActions: 'Acciones',
    viewDetail: 'Ver detalle',
    detailTitle: 'Detalle del Usuario',
    detailSubtitle: 'ID #{id} · Registro:',
    close: 'Cerrar',
    loadingDetail: 'Cargando información...',
    sectionContact: 'Datos de contacto',
    fieldName: 'Nombre completo',
    fieldEmail: 'Correo electrónico',
    fieldPhone: 'Teléfono',
    fieldStatus: 'Estado de revisión',
    fieldRole: 'Rol del usuario',
    statusPending: 'Pendiente',
    statusReviewed: 'Revisado',
    statusComplete: 'Completo',
    roleUser: 'Usuario',
    roleAdmin: 'Administrador',
    errorRequiredFields: 'Nombre y correo son requeridos',
    saving: 'Guardando...',
    save: 'Guardar cambios',
    saveOk: '✓ Cambios guardados correctamente',
    sectionFinancial: 'Resumen financiero',
    statActiveProcedures: 'Trámites activos',
    statTotalPaid: 'Total pagado',
    statTotalPending: 'Pendiente de pago',
    statTotalAmount: 'Total del contrato',
    sectionProcedures: 'Trámites en curso',
    paid: 'Pagado',
    total: 'Total',
    pending: 'Pendiente',
    documents: 'Documentos:',
    families: 'Familiares:',
    docPending: 'Pendiente',
    docUploaded: 'Entregado',
    paymentPending: 'Pendiente',
    paymentPaid: 'Pagado',
    downloadPdf: '↓ PDF',
    noProcedures: 'Este usuario aún no tiene trámites registrados.',
  },
  en: {
    loading: 'Loading admin panel...',
    title: 'Administration Panel',
    welcome: 'Welcome',
    logout: 'Sign out',
    statPending: 'Pending',
    statReviewed: 'Reviewed',
    statComplete: 'Complete',
    usersTitle: 'User Management',
    noUsers: 'No registered users',
    colId: 'ID',
    colName: 'Name',
    colEmail: 'Email',
    colStatus: 'Status',
    colRole: 'Role',
    colProvider: 'Provider',
    colDate: 'Registered',
    colActions: 'Actions',
    viewDetail: 'View detail',
    detailTitle: 'User Detail',
    detailSubtitle: 'ID #{id} · Registered:',
    close: 'Close',
    loadingDetail: 'Loading information...',
    sectionContact: 'Contact information',
    fieldName: 'Full name',
    fieldEmail: 'Email address',
    fieldPhone: 'Phone',
    fieldStatus: 'Review status',
    fieldRole: 'User role',
    statusPending: 'Pending',
    statusReviewed: 'Reviewed',
    statusComplete: 'Complete',
    roleUser: 'User',
    roleAdmin: 'Administrator',
    errorRequiredFields: 'Name and email are required',
    saving: 'Saving...',
    save: 'Save changes',
    saveOk: '✓ Changes saved successfully',
    sectionFinancial: 'Financial summary',
    statActiveProcedures: 'Active procedures',
    statTotalPaid: 'Total paid',
    statTotalPending: 'Pending payment',
    statTotalAmount: 'Contract total',
    sectionProcedures: 'Active procedures',
    paid: 'Paid',
    total: 'Total',
    pending: 'Pending',
    documents: 'Documents:',
    families: 'Family members:',
    docPending: 'Pending',
    docUploaded: 'Submitted',
    paymentPending: 'Pending',
    paymentPaid: 'Paid',
    downloadPdf: '↓ PDF',
    noProcedures: 'This user has no registered procedures yet.',
  },
}

const buildDocumentUrl = (fileName) => {
  const safePath = fileName
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return fileName.includes('/')
    ? `/api/uploads/${safePath}`
    : `/api/docs/${safePath}`
}

const AdminDashboard = ({ language = 'es' }) => {
  const t = adminContent[language] || adminContent.es
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', reviewStatus: 'pending', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const authUser = JSON.parse(localStorage.getItem('ventura-auth-user') || '{}')

  useEffect(() => {
    if (authUser.role !== 'admin') {
      navigate('/')
      return
    }
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/users', {
        headers: { 'x-user-id': authUser.id, 'x-user-role': authUser.role },
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Error al cargar usuarios')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openUserDetail = async (user) => {
    setDetailLoading(true)
    setSaveSuccess(false)
    setSelectedUser({ ...user, procedures: [], summary: null })
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      reviewStatus: user.reviewStatus,
      role: user.role,
    })
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        headers: { 'x-user-id': authUser.id, 'x-user-role': authUser.role },
      })
      if (!response.ok) throw new Error('No se pudo cargar el detalle')
      const data = await response.json()
      setSelectedUser({ ...data.user, procedures: data.procedures, summary: data.summary })
      setEditForm({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone || '',
        reviewStatus: data.user.reviewStatus,
        role: data.user.role,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedUser(null)
    setSaveSuccess(false)
    setError('')
  }

  const saveUserEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError(t.errorRequiredFields)
      return
    }
    try {
      setSaving(true)
      setError('')
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUser.id,
          'x-user-role': authUser.role,
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          reviewStatus: editForm.reviewStatus,
          role: editForm.role,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Error al guardar')
      }
      const data = await response.json()
      // Actualiza tabla y usuario seleccionado
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, ...data.user } : u)))
      setSelectedUser((prev) => ({ ...prev, ...data.user }))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ventura-auth-user')
    localStorage.removeItem('ventura-dashboard-data')
    navigate('/')
  }

  if (loading) {
    return <div className="admin-container"><p className="admin-loading">{t.loading}</p></div>
  }

  const pendingCount = users.filter((u) => u.reviewStatus === 'pending').length
  const reviewedCount = users.filter((u) => u.reviewStatus === 'reviewed').length
  const completeCount = users.filter((u) => u.reviewStatus === 'complete').length

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>{t.title}</h1>
          <p className="admin-welcome">{t.welcome}, {authUser.name}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn" title={t.logout} aria-label={t.logout}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="15 17 20 12 15 7" />
            <line x1="20" y1="12" x2="8" y2="12" />
          </svg>
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number pending">{pendingCount}</div>
          <div className="stat-label">{t.statPending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number reviewed">{reviewedCount}</div>
          <div className="stat-label">{t.statReviewed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number complete">{completeCount}</div>
          <div className="stat-label">{t.statComplete}</div>
        </div>
      </div>

      <div className="users-section">
        <h2>{t.usersTitle} ({users.length})</h2>
        {users.length === 0 ? (
          <p className="no-users">{t.noUsers}</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t.colId}</th>
                  <th>{t.colName}</th>
                  <th>{t.colEmail}</th>
                  <th>{t.colStatus}</th>
                  <th>{t.colRole}</th>
                  <th>{t.colProvider}</th>
                  <th>{t.colDate}</th>
                  <th>{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={selectedUser?.id === user.id ? 'row-selected' : ''}>
                    <td>{user.id}</td>
                    <td className="td-name">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-badge status-${user.reviewStatus}`}>
                        {t[`status${user.reviewStatus.charAt(0).toUpperCase()}${user.reviewStatus.slice(1)}`] || user.reviewStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className="provider-badge">{user.provider}</span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES')}</td>
                    <td>
                      <button onClick={() => openUserDetail(user)} className="btn btn-edit">
                        {t.viewDetail}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle del usuario */}
      {selectedUser && (
        <div className="detail-overlay" onClick={closeDetail}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <h2>{t.detailTitle}</h2>
                <p className="detail-subtitle">{t.detailSubtitle.replace('{id}', selectedUser.id)} {new Date(selectedUser.createdAt).toLocaleDateString(language === 'en' ? 'en-GB' : 'es-ES')}</p>
              </div>
              <button onClick={closeDetail} className="btn-close" aria-label={t.close}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {detailLoading ? (
              <p className="detail-loading">{t.loadingDetail}</p>
            ) : (
              <div className="detail-body">
                {/* Formulario de edición */}
                <section className="detail-section">
                  <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {t.sectionContact}
                  </h3>
                  <div className="edit-grid">
                    <label>
                      {t.fieldName}
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="edit-input"
                        placeholder={t.fieldName}
                      />
                    </label>
                    <label>
                      {t.fieldEmail}
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="edit-input"
                        placeholder="correo@ejemplo.com"
                      />
                    </label>
                    <label>
                      {t.fieldPhone}
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="edit-input"
                        placeholder="+34 600 000 000"
                      />
                    </label>
                    <label>
                      {t.fieldStatus}
                      <select
                        value={editForm.reviewStatus}
                        onChange={(e) => setEditForm({ ...editForm, reviewStatus: e.target.value })}
                        className="edit-select"
                      >
                        <option value="pending">{t.statusPending}</option>
                        <option value="reviewed">{t.statusReviewed}</option>
                        <option value="complete">{t.statusComplete}</option>
                      </select>
                    </label>
                    <label>
                      {t.fieldRole}
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className="edit-select"
                      >
                        <option value="user">{t.roleUser}</option>
                        <option value="admin">{t.roleAdmin}</option>
                      </select>
                    </label>
                  </div>
                  {error && <p className="save-error">{error}</p>}
                  {saveSuccess && <p className="save-success">{t.saveOk}</p>}
                  <button onClick={saveUserEdit} disabled={saving} className="btn btn-save btn-save-detail">
                    {saving ? t.saving : t.save}
                  </button>
                </section>

                {/* Resumen financiero */}
                {selectedUser.summary && (
                  <section className="detail-section">
                    <h3>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      {t.sectionFinancial}
                    </h3>
                    <div className="summary-grid">
                      <div className="summary-card">
                        <span className="summary-value">{selectedUser.summary.totalProcedures}</span>
                        <span className="summary-label">{t.statActiveProcedures}</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-value success">€{selectedUser.summary.totalPaid.toFixed(2)}</span>
                        <span className="summary-label">{t.statTotalPaid}</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-value warning">€{selectedUser.summary.totalPending.toFixed(2)}</span>
                        <span className="summary-label">{t.statTotalPending}</span>
                      </div>
                      <div className="summary-card">
                        <span className="summary-value">€{selectedUser.summary.totalAmount.toFixed(2)}</span>
                        <span className="summary-label">{t.statTotalAmount}</span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Trámites */}
                {selectedUser.procedures?.length > 0 && (
                  <section className="detail-section">
                    <h3>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {t.sectionProcedures}
                    </h3>
                    <div className="procedures-list">
                      {selectedUser.procedures.map((proc) => (
                        <div key={proc.id} className="procedure-card">
                          <div className="procedure-header">
                            <span className="procedure-title">{proc.title}</span>
                            <span className={`payment-badge payment-${proc.payment_status}`}>
                              {proc.payment_status === 'paid' ? t.paymentPaid : t.paymentPending}
                            </span>
                          </div>
                          <div className="procedure-amounts">
                            <span>{t.paid}: <strong>€{proc.paid_amount.toFixed(2)}</strong></span>
                            <span>{t.total}: <strong>€{proc.total_amount.toFixed(2)}</strong></span>
                            <span>{t.pending}: <strong className="amount-pending">€{(proc.total_amount - proc.paid_amount).toFixed(2)}</strong></span>
                          </div>
                          {proc.documentation?.length > 0 && (
                            <div className="doc-list">
                              <p className="doc-list-title">{t.documents}</p>
                              {proc.documentation.map((doc) => (
                                <div key={doc.id} className={`doc-item doc-${doc.status}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                  <span>{doc.title}</span>
                                  <span className={`doc-status-badge doc-status-${doc.status}`}>{doc.status === 'uploaded' ? t.docUploaded : t.docPending}</span>
                                  {doc.file_name && (
                                    <a
                                      href={buildDocumentUrl(doc.file_name)}
                                      download
                                      target="_blank"
                                      rel="noreferrer"
                                      className="doc-download"
                                    >
                                      {t.downloadPdf}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {proc.family_members?.length > 0 && (
                            <div className="family-list">
                              <p className="doc-list-title">{t.families}</p>
                              {proc.family_members.map((fm) => (
                                <div key={fm.id} className="family-item">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                  <span>{fm.name}</span>
                                  <span className="family-rel">{fm.relationship}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedUser.procedures?.length === 0 && (
                  <section className="detail-section">
                    <p className="no-users">{t.noProcedures}</p>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

