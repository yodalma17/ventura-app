import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { cpSync, mkdirSync, existsSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  attachFileToDocument,
  clearFileFromDocument,
  createLocalUser,
  createSocialUser,
  findUserByEmail,
  findUserDocumentById,
  findUserById,
  getAllUsers,
  getUsersCount,
  getUserDetail,
  updateUser,
  initializeDb,
  importPortableSnapshot,
  getDashboardData,
  createFamilyMemberProcedure,
  seedDemoDashboardData,
  seedDemoAdmin,
  seedTestUsers,
  DOCS_DIR,
  UPLOADS_DIR,
} from './db.js'

const app = express()
const port = process.env.PORT || 4000

// En producción, servir el frontend buildado
const __serverDir = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__serverDir, '..', 'dist')
const bundleDir = path.join(__serverDir, 'data-portability', 'latest')
const bundleManifestPath = path.join(bundleDir, 'manifest.json')
const importedStampPath = path.join(path.dirname(DOCS_DIR), '.bundle-import.json')

const clearDirectory = (dirPath) => {
  rmSync(dirPath, { recursive: true, force: true })
  mkdirSync(dirPath, { recursive: true })
}

const importBundleIfNeeded = async () => {
  if (!existsSync(bundleManifestPath)) {
    // eslint-disable-next-line no-console
    console.log('[bundle] No se encontró manifest en:', bundleManifestPath)
    return false
  }

  const manifest = JSON.parse(readFileSync(bundleManifestPath, 'utf8'))
  const bundleFingerprint = manifest?.database?.exportedAt || manifest?.exportedAt || 'unknown'
  // eslint-disable-next-line no-console
  console.log('[bundle] Manifest encontrado, fingerprint:', bundleFingerprint)

  if (existsSync(importedStampPath)) {
    try {
      const stamp = JSON.parse(readFileSync(importedStampPath, 'utf8'))
      if (stamp?.fingerprint === bundleFingerprint) {
        // eslint-disable-next-line no-console
        console.log('[bundle] Bundle ya importado previamente en:', stamp.importedAt)
        return false
      }
    } catch (_error) {
      // Ignore invalid stamp and continue with import
    }
  }

  // eslint-disable-next-line no-console
  console.log('[bundle] Importando bundle de datos...')
  await importPortableSnapshot(manifest.database)

  clearDirectory(DOCS_DIR)
  clearDirectory(UPLOADS_DIR)

  const docsSource = path.join(bundleDir, 'files', 'docs')
  const uploadsSource = path.join(bundleDir, 'files', 'uploads')

  if (existsSync(docsSource)) {
    cpSync(docsSource, DOCS_DIR, { recursive: true })
  }

  if (existsSync(uploadsSource)) {
    cpSync(uploadsSource, UPLOADS_DIR, { recursive: true })
  }

  writeFileSync(
    importedStampPath,
    JSON.stringify({ fingerprint: bundleFingerprint, importedAt: new Date().toISOString() }, null, 2),
    'utf8',
  )

  // eslint-disable-next-line no-console
  console.log('[bundle] Importación completada correctamente.')
  return true
}

app.use('/api/docs', express.static(DOCS_DIR))
app.use('/api/uploads', express.static(UPLOADS_DIR))

const normalizeEmail = (value = '') => value.trim().toLowerCase()

const microsoftDomains = ['hotmail.com', 'outlook.com', 'live.com', 'msn.com']

// Desde que el email viene del proveedor OAuth real, aceptamos cualquier dominio válido
const isAllowedSocialEmail = (provider, email) => {
  if (!email || !email.includes('@')) return false
  if (!['google', 'microsoft'].includes(provider)) return false
  return true
}

const verifyAdmin = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id']
    const userRole = req.headers['x-user-role']

    if (!userId || userRole !== 'admin') {
      res.status(403).json({ message: 'Admin access required.' })
      return
    }

    next()
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized.', detail: error.message })
  }
}

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  provider: user.provider,
  role: user.role,
  createdAt: user.createdAt,
})

const buildAuthResponse = async (user, message) => ({
  message,
  user: sanitizeUser(user),
  dashboardData: await getDashboardData(user.id),
})

const normalizeUploadPath = (value = '') => value.replace(/\\/g, '/')

const sanitizeFilePart = (value = '') => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'documento'
}

const removeUploadedFile = (relativePath) => {
  if (!relativePath) return

  const normalizedPath = normalizeUploadPath(relativePath)
  const absolutePath = path.join(UPLOADS_DIR, normalizedPath)

  if (!absolutePath.startsWith(UPLOADS_DIR)) {
    return
  }

  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath)
  }
}

const uploadStorage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const rawUserId = Number.parseInt(req.body.userId, 10)
    const safeUserId = Number.isNaN(rawUserId) ? 'temp' : `user-${rawUserId}`
    const targetDir = path.join(UPLOADS_DIR, safeUserId)

    mkdirSync(targetDir, { recursive: true })
    callback(null, targetDir)
  },
  filename: (req, file, callback) => {
    const documentId = Number.parseInt(req.params.documentId, 10)
    const extension = path.extname(file.originalname || '').toLowerCase() || '.bin'
    const baseName = sanitizeFilePart(path.basename(file.originalname || 'documento', extension))
    callback(null, `doc-${Number.isNaN(documentId) ? 'tmp' : documentId}-${Date.now()}-${baseName}${extension}`)
  },
})

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/dashboard', async (req, res) => {
  try {
    const userId = Number.parseInt(req.query.userId, 10)

    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Valid user ID required.' })
      return
    }

    const dashboardData = await getDashboardData(userId)
    res.json(dashboardData)
  } catch (error) {
    res.status(500).json({ message: 'Dashboard data could not be loaded.', detail: error.message })
  }
})

app.post('/api/documents/:documentId/upload', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const documentId = Number.parseInt(req.params.documentId, 10)
    const userId = Number.parseInt(req.body.userId, 10)

    if (Number.isNaN(documentId) || Number.isNaN(userId)) {
      if (req.file) {
        removeUploadedFile(path.posix.join(path.basename(path.dirname(req.file.path)), req.file.filename))
      }
      res.status(400).json({ message: 'Valid user ID and document ID are required.' })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: 'A file is required.' })
      return
    }

    const document = await findUserDocumentById(userId, documentId)

    if (!document) {
      removeUploadedFile(path.posix.join(`user-${userId}`, req.file.filename))
      res.status(404).json({ message: 'Document not found for this user.' })
      return
    }

    if (document.file_name) {
      removeUploadedFile(document.file_name)
    }

    const relativePath = path.posix.join(`user-${userId}`, req.file.filename)
    await attachFileToDocument(documentId, relativePath)

    res.status(201).json({
      message: 'Document uploaded successfully.',
      dashboardData: await getDashboardData(userId),
    })
  } catch (error) {
    if (req.file) {
      removeUploadedFile(path.posix.join(path.basename(path.dirname(req.file.path)), req.file.filename))
    }
    res.status(500).json({ message: 'File upload failed.', detail: error.message })
  }
})

app.delete('/api/documents/:documentId/file', async (req, res) => {
  try {
    const documentId = Number.parseInt(req.params.documentId, 10)
    const userId = Number.parseInt(req.body.userId, 10)

    if (Number.isNaN(documentId) || Number.isNaN(userId)) {
      res.status(400).json({ message: 'Valid user ID and document ID are required.' })
      return
    }

    const document = await findUserDocumentById(userId, documentId)

    if (!document) {
      res.status(404).json({ message: 'Document not found for this user.' })
      return
    }

    if (document.file_name) {
      removeUploadedFile(document.file_name)
    }

    await clearFileFromDocument(documentId)

    res.json({
      message: 'Document removed successfully.',
      dashboardData: await getDashboardData(userId),
    })
  } catch (error) {
    res.status(500).json({ message: 'File deletion failed.', detail: error.message })
  }
})

app.post('/api/family-members', async (req, res) => {
  try {
    const userId = Number.parseInt(req.body.userId, 10)
    const familyName = (req.body.familyName || '').trim()
    const relationship = (req.body.relationship || '').trim()
    const procedureTitle = (req.body.procedureTitle || '').trim()
    const rawAge = req.body.age
    const parsedAge = rawAge === undefined || rawAge === null || rawAge === ''
      ? null
      : Number.parseInt(rawAge, 10)

    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Valid user ID required.' })
      return
    }

    if (!familyName || !relationship || !procedureTitle) {
      res.status(400).json({
        message: 'Family member name, relationship and procedure title are required.',
      })
      return
    }

    if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120)) {
      res.status(400).json({ message: 'Age must be a number between 1 and 120.' })
      return
    }

    const user = await findUserById(userId)
    if (!user) {
      res.status(404).json({ message: 'User not found.' })
      return
    }

    const dashboardData = await createFamilyMemberProcedure({
      userId,
      familyName,
      relationship,
      procedureTitle,
      age: parsedAge,
    })

    res.status(201).json({
      message: 'Family member added successfully.',
      dashboardData,
    })
  } catch (error) {
    res.status(500).json({
      message: 'Could not add family member.',
      detail: error.message,
    })
  }
})

app.put('/api/profile/me', async (req, res) => {
  try {
    const userId = Number.parseInt(req.body.userId, 10)
    const name = (req.body.name || '').trim() || undefined
    const email = req.body.email ? normalizeEmail(req.body.email) : undefined
    const phone = req.body.phone !== undefined ? (req.body.phone || '').trim() || null : undefined

    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Invalid user ID.' })
      return
    }

    if (!name && !email && phone === undefined) {
      res.status(400).json({ message: 'At least one field must be provided.' })
      return
    }

    const existingUser = await findUserById(userId)
    if (!existingUser) {
      res.status(404).json({ message: 'User not found.' })
      return
    }

    if (email && email !== existingUser.email) {
      const emailExists = await findUserByEmail(email)
      if (emailExists) {
        res.status(409).json({ message: 'This email is already in use.' })
        return
      }
    }

    const updatedUser = await updateUser(userId, { name, email, phone })

    if (!updatedUser) {
      res.status(500).json({ message: 'Failed to update user profile.' })
      return
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || null,
        provider: updatedUser.provider,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Profile update error:', error)
    res.status(500).json({ message: 'Failed to update profile.', detail: error.message })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim()
    const email = normalizeEmail(req.body.email)
    const password = req.body.password || ''

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Missing required fields.' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must have at least 6 characters.' })
      return
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      res.status(409).json({ message: 'This email is already registered.' })
      return
    }

    const user = await createLocalUser({ name, email, password })
    res.status(201).json(await buildAuthResponse(user, 'Registered successfully.'))
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', detail: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const password = req.body.password || ''

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' })
      return
    }

    const user = await findUserByEmail(email)
    if (!user) {
      res.status(404).json({ message: 'User not found.' })
      return
    }

    if (user.provider !== 'local') {
      res.status(400).json({ message: 'Use social login for this account.' })
      return
    }

    const isValid = await bcrypt.compare(password, user.passwordHash || '')
    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials.' })
      return
    }

    res.json(await buildAuthResponse(user, 'Logged in successfully.'))
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', detail: error.message })
  }
})

app.post('/api/auth/social', async (req, res) => {
  try {
    const provider = req.body.provider
    const email = normalizeEmail(req.body.email)
    const name = (req.body.name || '').trim() || 'Social User'

    if (!provider || !email) {
      res.status(400).json({ message: 'Provider and email are required.' })
      return
    }

    if (!['google', 'microsoft'].includes(provider)) {
      res.status(400).json({ message: 'Unsupported social provider.' })
      return
    }

    if (!isAllowedSocialEmail(provider, email)) {
      res.status(400).json({
        message:
          provider === 'google'
            ? 'Google login requires a Gmail address.'
            : 'Microsoft login requires Hotmail, Outlook, Live or MSN address.',
      })
      return
    }

    const existing = await findUserByEmail(email)

    if (existing) {
      if (existing.provider !== provider) {
        res.status(409).json({
          message: 'This email was created with another login method.',
        })
        return
      }

      res.json(await buildAuthResponse(existing, 'Logged in successfully.'))
      return
    }

    const user = await createSocialUser({ name, email, provider })
    res.status(201).json(await buildAuthResponse(user, 'Social account created.'))
  } catch (error) {
    res.status(500).json({ message: 'Social login failed.', detail: error.message })
  }
})

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json({
      message: 'Users retrieved successfully.',
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        provider: user.provider,
        role: user.role,
        reviewStatus: user.review_status,
        createdAt: user.createdAt,
      })),
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve users.', detail: error.message })
  }
})

app.get('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10)
    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Invalid user ID.' })
      return
    }
    const detail = await getUserDetail(userId)
    if (!detail) {
      res.status(404).json({ message: 'User not found.' })
      return
    }
    res.json({
      message: 'User detail retrieved successfully.',
      user: {
        id: detail.user.id,
        name: detail.user.name,
        email: detail.user.email,
        phone: detail.user.phone || null,
        provider: detail.user.provider,
        role: detail.user.role,
        reviewStatus: detail.user.review_status,
        createdAt: detail.user.createdAt,
      },
      procedures: detail.procedures,
      summary: detail.summary,
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve user detail.', detail: error.message })
  }
})

app.put('/api/admin/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const userId = Number.parseInt(req.params.userId, 10)
    const name = (req.body.name || '').trim() || undefined
    const email = req.body.email ? normalizeEmail(req.body.email) : undefined
    const phone = req.body.phone !== undefined ? (req.body.phone || '').trim() || null : undefined
    const reviewStatus = req.body.reviewStatus
    const role = req.body.role

    if (Number.isNaN(userId)) {
      res.status(400).json({ message: 'Invalid user ID.' })
      return
    }

    if (!name && !email && phone === undefined && !reviewStatus && !role) {
      res.status(400).json({ message: 'At least one field must be provided.' })
      return
    }

    const validStatuses = ['pending', 'reviewed', 'complete']
    if (reviewStatus && !validStatuses.includes(reviewStatus)) {
      res.status(400).json({ message: `Review status must be one of: ${validStatuses.join(', ')}` })
      return
    }

    const validRoles = ['user', 'admin']
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` })
      return
    }

    const existingUser = await findUserById(userId)
    if (!existingUser) {
      res.status(404).json({ message: 'User not found.' })
      return
    }

    if (email && email !== existingUser.email) {
      const emailExists = await findUserByEmail(email)
      if (emailExists) {
        res.status(409).json({ message: 'This email is already in use.' })
        return
      }
    }

    const updatedUser = await updateUser(userId, { name, email, phone, reviewStatus, role })

    res.json({
      message: 'User updated successfully.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone || null,
        provider: updatedUser.provider,
        role: updatedUser.role,
        reviewStatus: updatedUser.review_status,
        createdAt: updatedUser.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user.', detail: error.message })
  }
})

// Error handlers
// En producción: servir React SPA para todas las rutas no-API
if (existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found.', path: req.path })
})

// Generic 404 (solo en desarrollo, cuando no existe dist)
app.use((req, res) => {
  res.status(404).json({ message: 'Not found.', path: req.path })
})

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Express error:', err)
  res.status(500).json({ message: 'Internal server error.', detail: err.message })
})

initializeDb()
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log('[server] Base de datos inicializada correctamente')
    // eslint-disable-next-line no-console
    console.log('[server] DATA_DIR:', process.env.DATA_DIR || '(no definido, usando default)')
    // eslint-disable-next-line no-console
    console.log('[server] NODE_ENV:', process.env.NODE_ENV || 'development')
    // eslint-disable-next-line no-console
    console.log('[server] distPath existe:', existsSync(path.join(distPath, 'index.html')))

    const bundleImported = await importBundleIfNeeded()
    // eslint-disable-next-line no-console
    console.log('[server] importBundleIfNeeded:', bundleImported ? 'bundle importado' : 'ya importado o no existe')

    // Garantizar siempre que el admin existe, independientemente del bundle
    await seedDemoAdmin()
    // eslint-disable-next-line no-console
    console.log('[server] Admin garantizado: admin.ventura@gmail.com / admin1234')

    const usersCount = await getUsersCount()
    // eslint-disable-next-line no-console
    console.log('[server] Usuarios en BD:', usersCount)

    if (usersCount <= 1) {
      // eslint-disable-next-line no-console
      console.log('[server] BD sin usuarios de demo, ejecutando seed...')
      await seedDemoDashboardData()
      await seedTestUsers()
      // eslint-disable-next-line no-console
      console.log('[server] Seed de demo completado')
    }
  })
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`[server] Servidor escuchando en 0.0.0.0:${port}`)
    })
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[server] ERROR al inicializar la base de datos:', error)
    process.exit(1)
  })
