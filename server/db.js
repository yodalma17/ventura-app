import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcryptjs'

const currentFilePath = fileURLToPath(import.meta.url)
const serverDir = path.dirname(currentFilePath)
// En Railway: configura DATA_DIR apuntando a un Volume (p.ej. /data)
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(serverDir, 'data')
const dbPath = path.join(dataDir, 'auth.sqlite')

mkdirSync(dataDir, { recursive: true })

const db = new sqlite3.Database(dbPath)

export const closeDb = () =>
  new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function onRun(error) {
      if (error) {
        reject(error)
        return
      }

      resolve({ id: this.lastID, changes: this.changes })
    })
  })

const get = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })

const all = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })

const DEMO_USER_EMAIL = 'demo.user.ventura@gmail.com'
const PORTABLE_TABLES = ['users', 'procedures', 'payments', 'documentation', 'family_members']

export const initializeDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT,
      provider TEXT NOT NULL DEFAULT 'local',
      role TEXT NOT NULL DEFAULT 'user',
      review_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migraciones para columnas nuevas en tablas existentes
  const migrations = [
    `ALTER TABLE users ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE users ADD COLUMN phone TEXT`,
    `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
  ]
  for (const migration of migrations) {
    try { await run(migration) } catch (_) { /* ya existe */ }
  }

  await run(`
    CREATE TABLE IF NOT EXISTS procedures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      procedure_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (procedure_id) REFERENCES procedures(id)
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS documentation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      procedure_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      file_name TEXT,
      uploaded_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (procedure_id) REFERENCES procedures(id)
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      procedure_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      age INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (procedure_id) REFERENCES procedures(id)
    )
  `)

  try {
    await run('ALTER TABLE family_members ADD COLUMN age INTEGER')
  } catch (_) {
    // column already exists
  }
}

export const findUserByEmail = async (email) => {
  return get(
    `
      SELECT id, name, email, phone, password_hash AS passwordHash, provider, role, review_status, created_at AS createdAt
      FROM users
      WHERE email = ?
    `,
    [email],
  )
}

export const findUserById = async (userId) => {
  return get(
    `
      SELECT id, name, email, phone, provider, role, review_status, created_at AS createdAt
      FROM users
      WHERE id = ?
    `,
    [userId],
  )
}

export const getAllUsers = async () => {
  return all(
    `
      SELECT id, name, email, phone, provider, role, review_status, created_at AS createdAt
      FROM users
      ORDER BY created_at DESC
    `,
  )
}

export const getUsersCount = async () => {
  const result = await get('SELECT COUNT(*) AS total FROM users')
  return result?.total || 0
}

export const getUserDetail = async (userId) => {
  const user = await findUserById(userId)
  if (!user) return null

  const procedures = await all(
    `SELECT id, title, type, status, payment_status, total_amount, paid_amount, created_at
     FROM procedures WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  )

  const proceduresWithDetails = await Promise.all(
    procedures.map(async (proc) => {
      const payments = await all(
        'SELECT id, amount, status, payment_date FROM payments WHERE procedure_id = ?',
        [proc.id],
      )
      const documentation = await all(
        'SELECT id, title, status, file_name FROM documentation WHERE procedure_id = ?',
        [proc.id],
      )
      const family = await all(
        'SELECT id, name, relationship, age, status FROM family_members WHERE procedure_id = ?',
        [proc.id],
      )
      return { ...proc, payments, documentation, family_members: family }
    }),
  )

  const totalPaid = proceduresWithDetails.reduce((sum, p) => sum + p.paid_amount, 0)
  const totalAmount = proceduresWithDetails.reduce((sum, p) => sum + p.total_amount, 0)

  return {
    user,
    procedures: proceduresWithDetails,
    summary: {
      totalProcedures: procedures.length,
      totalAmount,
      totalPaid,
      totalPending: totalAmount - totalPaid,
    },
  }
}

export const findUserDocumentById = async (userId, documentId) => {
  return get(
    `
      SELECT
        d.id,
        d.title,
        d.status,
        d.file_name,
        d.procedure_id,
        p.user_id,
        p.title AS procedure_title
      FROM documentation d
      INNER JOIN procedures p ON p.id = d.procedure_id
      WHERE d.id = ? AND p.user_id = ?
    `,
    [documentId, userId],
  )
}

export const attachFileToDocument = async (documentId, fileName) => {
  await run(
    `
      UPDATE documentation
      SET file_name = ?, status = 'uploaded', uploaded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [fileName, documentId],
  )
}

export const clearFileFromDocument = async (documentId) => {
  await run(
    `
      UPDATE documentation
      SET file_name = NULL, status = 'pending', uploaded_at = NULL
      WHERE id = ?
    `,
    [documentId],
  )
}

export const updateUser = async (userId, { name, email, phone, reviewStatus, role }) => {
  const updates = []
  const params = []

  if (name !== undefined && name !== null) { updates.push('name = ?'); params.push(name) }
  if (email !== undefined && email !== null) { updates.push('email = ?'); params.push(email) }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone) }
  if (reviewStatus !== undefined && reviewStatus !== null) { updates.push('review_status = ?'); params.push(reviewStatus) }
  if (role !== undefined && role !== null) { updates.push('role = ?'); params.push(role) }

  if (updates.length === 0) return findUserById(userId)

  params.push(userId)
  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

  return findUserById(userId)
}

export const createLocalUser = async ({ name, email, password, role = 'user' }) => {
  const passwordHash = await bcrypt.hash(password, 10)

  await run(
    `
      INSERT INTO users (name, email, password_hash, provider, role)
      VALUES (?, ?, ?, 'local', ?)
    `,
    [name, email, passwordHash, role],
  )

  return findUserByEmail(email)
}

export const createSocialUser = async ({ name, email, provider, role = 'user' }) => {
  await run(
    `
      INSERT INTO users (name, email, password_hash, provider, role)
      VALUES (?, ?, NULL, ?, ?)
    `,
    [name, email, provider, role],
  )

  return findUserByEmail(email)
}

export const createFamilyMemberProcedure = async ({ userId, familyName, relationship, procedureTitle, age }) => {
  const title = (procedureTitle || '').trim()
  const name = (familyName || '').trim()
  const relation = (relationship || '').trim()
  const normalizedAge = Number.isInteger(age) && age > 0 ? age : null

  if (!title || !name || !relation) {
    throw new Error('Procedure title, family member name and relationship are required.')
  }

  const procedureResult = await run(
    `
      INSERT INTO procedures (user_id, title, type, status, payment_status, total_amount, paid_amount)
      VALUES (?, ?, 'family-members', 'active', 'pending', 0, 0)
    `,
    [userId, title],
  )

  await run(
    `
      INSERT INTO family_members (procedure_id, name, relationship, age, status)
      VALUES (?, ?, ?, ?, 'pending')
    `,
    [procedureResult.id, name, relation, normalizedAge],
  )

  return getDashboardData(userId)
}

export const seedDemoDashboardData = async () => {
  let demoUser = await findUserByEmail(DEMO_USER_EMAIL)

  if (!demoUser) {
    demoUser = await createLocalUser({
      name: 'Demo User',
      email: DEMO_USER_EMAIL,
      password: 'demo1234',
      role: 'user',
    })
  }

  const existingProcedures = await all(
    `
      SELECT id
      FROM procedures
      WHERE user_id = ?
    `,
    [demoUser.id],
  )

  for (const procedure of existingProcedures) {
    await run('DELETE FROM payments WHERE procedure_id = ?', [procedure.id])
    await run('DELETE FROM documentation WHERE procedure_id = ?', [procedure.id])
    await run('DELETE FROM family_members WHERE procedure_id = ?', [procedure.id])
  }

  await run('DELETE FROM procedures WHERE user_id = ?', [demoUser.id])

  const pendingPaymentProcedure = await run(
    `
      INSERT INTO procedures (
        user_id,
        title,
        type,
        status,
        payment_status,
        total_amount,
        paid_amount
      )
      VALUES (?, ?, ?, 'active', 'pending', ?, ?)
    `,
    [
      demoUser.id,
      'Arraigo familiar paso a paso',
      'pending-payment',
      1490,
      490,
    ],
  )

  await run(
    `
      INSERT INTO payments (procedure_id, amount, status, payment_date)
      VALUES (?, ?, 'paid', '2026-04-02 10:15:00')
    `,
    [pendingPaymentProcedure.id, 490],
  )

  await run(
    `
      INSERT INTO payments (procedure_id, amount, status)
      VALUES (?, ?, 'pending')
    `,
    [pendingPaymentProcedure.id, 1000],
  )

  const pendingDocumentationProcedure = await run(
    `
      INSERT INTO procedures (
        user_id,
        title,
        type,
        status,
        payment_status,
        total_amount,
        paid_amount
      )
      VALUES (?, ?, ?, 'active', 'paid', ?, ?)
    `,
    [
      demoUser.id,
      'Homologacion universitaria',
      'pending-documentation',
      690,
      690,
    ],
  )

  await run(
    `
      INSERT INTO payments (procedure_id, amount, status, payment_date)
      VALUES (?, ?, 'paid', '2026-04-01 09:30:00')
    `,
    [pendingDocumentationProcedure.id, 690],
  )

  await run(
    `
      INSERT INTO documentation (procedure_id, title, status, file_name)
      VALUES (?, ?, 'pending', ?)
    `,
    [pendingDocumentationProcedure.id, 'Pasaporte vigente', 'pasaporte-pendiente.pdf'],
  )

  await run(
    `
      INSERT INTO documentation (procedure_id, title, status, file_name)
      VALUES (?, ?, 'uploaded', ?)
    `,
    [pendingDocumentationProcedure.id, 'Titulo universitario', 'titulo-subido.pdf'],
  )

  const familyProcedure = await run(
    `
      INSERT INTO procedures (
        user_id,
        title,
        type,
        status,
        payment_status,
        total_amount,
        paid_amount
      )
      VALUES (?, ?, ?, 'active', 'paid', ?, ?)
    `,
    [
      demoUser.id,
      'Reagrupacion familiar expediente completo',
      'family-members',
      1890,
      1890,
    ],
  )

  await run(
    `
      INSERT INTO payments (procedure_id, amount, status, payment_date)
      VALUES (?, ?, 'paid', '2026-03-30 13:00:00')
    `,
    [familyProcedure.id, 1890],
  )

  await run(
    `
      INSERT INTO family_members (procedure_id, name, relationship, status)
      VALUES (?, ?, ?, 'pending')
    `,
    [familyProcedure.id, 'Maria Alvarez', 'Conyuge'],
  )

  await run(
    `
      INSERT INTO family_members (procedure_id, name, relationship, status)
      VALUES (?, ?, ?, 'pending')
    `,
    [familyProcedure.id, 'Lucas Alvarez', 'Hijo'],
  )
}

export const getDashboardData = async (userId) => {
  const procedures = await all(
    `
      SELECT id, title, type, status, payment_status, total_amount, paid_amount, created_at
      FROM procedures
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    [userId],
  )

  const procedures_with_details = await Promise.all(
    procedures.map(async (proc) => {
      const payments = await all(
        'SELECT id, amount, status, payment_date FROM payments WHERE procedure_id = ?',
        [proc.id],
      )
      const documentation = await all(
        'SELECT id, title, status, file_name FROM documentation WHERE procedure_id = ?',
        [proc.id],
      )
      const family = await all(
        'SELECT id, name, relationship, age, status FROM family_members WHERE procedure_id = ?',
        [proc.id],
      )

      return {
        ...proc,
        payments,
        documentation,
        family_members: family,
      }
    }),
  )

  const pendingPayments = procedures_with_details.filter((p) => p.payment_status === 'pending')
  const activeProcedures = procedures_with_details.filter((p) => p.status === 'active')
  const pendingDocumentation = procedures_with_details.filter((p) =>
    p.documentation.some((item) => item.status === 'pending'),
  )
  const familyMemberProcedures = procedures_with_details.filter(
    (p) => p.family_members.length > 0,
  )

  return {
    procedures: procedures_with_details,
    stats: {
      active_procedures: activeProcedures.length,
      pending_payments: pendingPayments.length,
      total_procedures: procedures_with_details.length,
    },
    alerts: {
      pendingPayments: pendingPayments.map((procedure) => ({
        id: procedure.id,
        title: procedure.title,
        totalAmount: procedure.total_amount,
        paidAmount: procedure.paid_amount,
      })),
      pendingDocumentation: pendingDocumentation.map((procedure) => ({
        id: procedure.id,
        title: procedure.title,
        missingDocuments: procedure.documentation.filter((item) => item.status === 'pending'),
      })),
      familyMembers: familyMemberProcedures.map((procedure) => ({
        id: procedure.id,
        title: procedure.title,
        members: procedure.family_members,
      })),
    },
  }
}

export const exportPortableSnapshot = async () => {
  const [users, procedures, payments, documentation, familyMembers] = await Promise.all([
    all('SELECT * FROM users ORDER BY id ASC'),
    all('SELECT * FROM procedures ORDER BY id ASC'),
    all('SELECT * FROM payments ORDER BY id ASC'),
    all('SELECT * FROM documentation ORDER BY id ASC'),
    all('SELECT * FROM family_members ORDER BY id ASC'),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      users,
      procedures,
      payments,
      documentation,
      family_members: familyMembers,
    },
  }
}

export const importPortableSnapshot = async (snapshot) => {
  if (!snapshot?.tables) {
    throw new Error('Portable snapshot is missing tables data.')
  }

  const tables = {
    users: snapshot.tables.users || [],
    procedures: snapshot.tables.procedures || [],
    payments: snapshot.tables.payments || [],
    documentation: snapshot.tables.documentation || [],
    family_members: snapshot.tables.family_members || [],
  }

  await run('PRAGMA foreign_keys = OFF')

  try {
    await run('BEGIN TRANSACTION')

    await run('DELETE FROM payments')
    await run('DELETE FROM documentation')
    await run('DELETE FROM family_members')
    await run('DELETE FROM procedures')
    await run('DELETE FROM users')
    await run(`DELETE FROM sqlite_sequence WHERE name IN (${PORTABLE_TABLES.map(() => '?').join(', ')})`, PORTABLE_TABLES)

    for (const user of tables.users) {
      await run(
        `
          INSERT INTO users (id, name, email, phone, password_hash, provider, role, review_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.name,
          user.email,
          user.phone ?? null,
          user.password_hash ?? null,
          user.provider,
          user.role,
          user.review_status,
          user.created_at,
        ],
      )
    }

    for (const procedure of tables.procedures) {
      await run(
        `
          INSERT INTO procedures (id, user_id, title, type, status, payment_status, total_amount, paid_amount, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          procedure.id,
          procedure.user_id,
          procedure.title,
          procedure.type,
          procedure.status,
          procedure.payment_status,
          procedure.total_amount,
          procedure.paid_amount,
          procedure.created_at,
        ],
      )
    }

    for (const payment of tables.payments) {
      await run(
        `
          INSERT INTO payments (id, procedure_id, amount, status, payment_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          payment.id,
          payment.procedure_id,
          payment.amount,
          payment.status,
          payment.payment_date ?? null,
          payment.created_at,
        ],
      )
    }

    for (const document of tables.documentation) {
      await run(
        `
          INSERT INTO documentation (id, procedure_id, title, status, file_name, uploaded_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          document.id,
          document.procedure_id,
          document.title,
          document.status,
          document.file_name ?? null,
          document.uploaded_at ?? null,
          document.created_at,
        ],
      )
    }

    for (const familyMember of tables.family_members) {
      await run(
        `
          INSERT INTO family_members (id, procedure_id, name, relationship, age, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          familyMember.id,
          familyMember.procedure_id,
          familyMember.name,
          familyMember.relationship,
          familyMember.age ?? null,
          familyMember.status,
          familyMember.created_at,
        ],
      )
    }

    await run('COMMIT')
  } catch (error) {
    await run('ROLLBACK')
    throw error
  } finally {
    await run('PRAGMA foreign_keys = ON')
  }
}

export const seedDemoAdmin = async () => {
  const adminEmail = 'admin.ventura@gmail.com'
  const existingAdmin = await findUserByEmail(adminEmail)

  if (!existingAdmin) {
    await createLocalUser({
      name: 'Admin Ventura',
      email: adminEmail,
      password: 'admin1234',
      role: 'admin',
    })
  }
}

// ── PDF placeholder mínimo válido ─────────────────────────────────────────
const makePdf = (title) => {
  const body = `BT\n/F1 14 Tf\n50 750 Td\n(VENTURA EXTRANJERIA - DOCUMENTO DE PRUEBA) Tj\n0 -30 Td\n/F1 11 Tf\n(${title.replace(/[()]/g, '')}) Tj\n0 -25 Td\n(Este documento fue generado automaticamente para testing.) Tj\n0 -20 Td\n(No tiene validez legal.) Tj\n0 -40 Td\n(Ventura Extranjeria S.L.) Tj\n0 -18 Td\n(C/Gran Via 45, Madrid 28013) Tj\n0 -18 Td\n(info@venturaextranjeria.com | +34 910 123 456) Tj\nET`
  const streamLen = body.length
  return [
    `%PDF-1.4`,
    `1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj`,
    `2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj`,
    `3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>\nendobj`,
    `4 0 obj\n<</Length ${streamLen}>>\nstream\n${body}\nendstream\nendobj`,
    `5 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj`,
    `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000${(500 + streamLen).toString().padStart(3, '0')} 00000 n `,
    `trailer\n<</Size 6/Root 1 0 R>>`,
    `startxref\n${580 + streamLen}`,
    `%%EOF`,
  ].join('\n')
}

export const DOCS_DIR = path.join(dataDir, 'docs')
export const UPLOADS_DIR = path.join(dataDir, 'uploads')

export const ensurePlaceholderDocs = () => {
  mkdirSync(DOCS_DIR, { recursive: true })

  const files = [
    { name: 'pasaporte-vigente.pdf', title: 'Pasaporte Vigente' },
    { name: 'empadronamiento.pdf', title: 'Certificado de Empadronamiento' },
    { name: 'contrato-trabajo.pdf', title: 'Contrato de Trabajo' },
    { name: 'seguro-medico.pdf', title: 'Seguro Medico Privado' },
    { name: 'titulo-universitario.pdf', title: 'Titulo Universitario' },
    { name: 'certificado-antecedentes.pdf', title: 'Certificado de Antecedentes Penales' },
    { name: 'extracto-bancario.pdf', title: 'Extracto Bancario Ultimos 3 Meses' },
    { name: 'foto-carnet.pdf', title: 'Fotografias Carnet' },
    { name: 'partida-nacimiento.pdf', title: 'Partida de Nacimiento' },
    { name: 'certificado-matrimonio.pdf', title: 'Certificado de Matrimonio' },
    { name: 'poder-notarial.pdf', title: 'Poder Notarial para Tramites' },
    { name: 'acreditacion-solvencia.pdf', title: 'Acreditacion de Solvencia Economica' },
  ]

  for (const { name, title } of files) {
    const filePath = path.join(DOCS_DIR, name)
    if (!existsSync(filePath)) {
      writeFileSync(filePath, makePdf(title), 'binary')
    }
  }
}

export const seedTestUsers = async () => {
  ensurePlaceholderDocs()

  const PASSWORD_HASH = await bcrypt.hash('test1234', 10)

  const insertUserIfNew = async ({ name, email, phone, reviewStatus = 'pending' }) => {
    const existing = await findUserByEmail(email)
    if (existing) {
      return existing
    }

    await run(
      `INSERT INTO users (name, email, phone, password_hash, provider, role, review_status)
       VALUES (?, ?, ?, ?, 'local', 'user', ?)`,
      [name, email, phone, PASSWORD_HASH, reviewStatus],
    )

    return findUserByEmail(email)
  }

  const resetUserCases = async (userId) => {
    const existingProcedures = await all(
      `SELECT id
       FROM procedures
       WHERE user_id = ?`,
      [userId],
    )

    for (const procedure of existingProcedures) {
      await run('DELETE FROM payments WHERE procedure_id = ?', [procedure.id])
      await run('DELETE FROM documentation WHERE procedure_id = ?', [procedure.id])
      await run('DELETE FROM family_members WHERE procedure_id = ?', [procedure.id])
    }

    await run('DELETE FROM procedures WHERE user_id = ?', [userId])
  }

  const proc = async (userId, title, type, paymentStatus, total, paid) => {
    const r = await run(
      `INSERT INTO procedures (user_id, title, type, status, payment_status, total_amount, paid_amount)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      [userId, title, type, paymentStatus, total, paid],
    )
    return r.id
  }

  const pay = (procId, amount, status, date = null) =>
    run(`INSERT INTO payments (procedure_id, amount, status, payment_date) VALUES (?, ?, ?, ?)`, [procId, amount, status, date])

  const doc = (procId, title, status, fileName = null) =>
    run(`INSERT INTO documentation (procedure_id, title, status, file_name) VALUES (?, ?, ?, ?)`, [procId, title, status, fileName])

  const fam = (procId, name, relationship) =>
    run(`INSERT INTO family_members (procedure_id, name, relationship, status) VALUES (?, ?, ?, 'pending')`, [procId, name, relationship])

  // ── U1: Solo pago pendiente total ────────────────────────────────────────
  const u1 = await insertUserIfNew({ name: 'Carlos Mendez Rosas', email: 'carlos.mendez@test.com', phone: '+34 612 001 001' })
  await resetUserCases(u1.id)
  const p1 = await proc(u1.id, 'Arraigo Social', 'pending-payment', 'pending', 1200, 0)
  await pay(p1, 1200, 'pending')

  // ── U2: Pago parcial — pagó señal, falta el resto ─────────────────────────
  const u2 = await insertUserIfNew({ name: 'Fatima Ouali El Harti', email: 'fatima.ouali@test.com', phone: '+34 612 002 002' })
  await resetUserCases(u2.id)
  const p2 = await proc(u2.id, 'Residencia por Arraigo Familiar', 'pending-payment', 'pending', 1490, 490)
  await pay(p2, 490, 'paid', '2026-03-15 10:00:00')
  await pay(p2, 1000, 'pending')

  // ── U3: 2 documentos pendientes ──────────────────────────────────────────
  const u3 = await insertUserIfNew({ name: 'Andrei Popescu Ionescu', email: 'andrei.popescu@test.com', phone: '+34 612 003 003', reviewStatus: 'reviewed' })
  await resetUserCases(u3.id)
  const p3 = await proc(u3.id, 'Homologacion Titulo Universitario', 'pending-documentation', 'paid', 690, 690)
  await pay(p3, 690, 'paid', '2026-03-20 11:30:00')
  await doc(p3, 'Titulo universitario apostillado', 'pending')
  await doc(p3, 'Traduccion jurada al espanol', 'pending')

  // ── U4: Todos los documentos entregados, esperando resolución ─────────────
  const u4 = await insertUserIfNew({ name: 'Priya Sharma Nair', email: 'priya.sharma@test.com', phone: '+34 612 004 004', reviewStatus: 'reviewed' })
  await resetUserCases(u4.id)
  const p4 = await proc(u4.id, 'Visado de Estudios Postgrado', 'pending-documentation', 'paid', 850, 850)
  await pay(p4, 850, 'paid', '2026-02-28 09:00:00')
  await doc(p4, 'Pasaporte vigente', 'uploaded', 'pasaporte-vigente.pdf')
  await doc(p4, 'Carta de admision universitaria', 'uploaded', 'titulo-universitario.pdf')
  await doc(p4, 'Seguro medico privado', 'uploaded', 'seguro-medico.pdf')
  await doc(p4, 'Extracto bancario 3 meses', 'uploaded', 'extracto-bancario.pdf')

  // ── U5: Reagrupación familiar — cónyuge + 2 hijos + doc pendiente ─────────
  const u5 = await insertUserIfNew({ name: 'Moussa Diallo Traore', email: 'moussa.diallo@test.com', phone: '+34 612 005 005' })
  await resetUserCases(u5.id)
  const p5 = await proc(u5.id, 'Reagrupacion Familiar Completa', 'family-members', 'paid', 2100, 2100)
  await pay(p5, 2100, 'paid', '2026-03-01 14:00:00')
  await fam(p5, 'Aminata Diallo', 'Conyuge')
  await fam(p5, 'Ibrahim Diallo', 'Hijo')
  await fam(p5, 'Hawa Diallo', 'Hija')
  await doc(p5, 'Certificado de matrimonio apostillado', 'uploaded', 'certificado-matrimonio.pdf')
  await doc(p5, 'Partidas de nacimiento hijos', 'pending')

  // ── U6: Caso completo — 2 trámites, todo entregado y pagado ──────────────
  const u6 = await insertUserIfNew({ name: 'Daniela Reyes Castillo', email: 'daniela.reyes@test.com', phone: '+34 612 006 006', reviewStatus: 'complete' })
  await resetUserCases(u6.id)
  const p6a = await proc(u6.id, 'Permiso Trabajo Cuenta Ajena', 'pending-documentation', 'paid', 1350, 1350)
  await pay(p6a, 1350, 'paid', '2026-01-10 10:00:00')
  await doc(p6a, 'Pasaporte vigente', 'uploaded', 'pasaporte-vigente.pdf')
  await doc(p6a, 'Contrato de trabajo firmado', 'uploaded', 'contrato-trabajo.pdf')
  await doc(p6a, 'Certificado de empadronamiento', 'uploaded', 'empadronamiento.pdf')
  await doc(p6a, 'Antecedentes penales apostillados', 'uploaded', 'certificado-antecedentes.pdf')
  const p6b = await proc(u6.id, 'Renovacion TIE', 'pending-documentation', 'paid', 480, 480)
  await pay(p6b, 480, 'paid', '2026-02-05 11:00:00')
  await doc(p6b, 'Fotografia carnet', 'uploaded', 'foto-carnet.pdf')
  await doc(p6b, 'Empadronamiento reciente', 'uploaded', 'empadronamiento.pdf')

  // ── U7: 2 trámites: uno sin pagar, otro con doc pendiente ─────────────────
  const u7 = await insertUserIfNew({ name: 'Yusuf Al-Rashid Hassan', email: 'yusuf.rashid@test.com', phone: '+34 612 007 007' })
  await resetUserCases(u7.id)
  const p7a = await proc(u7.id, 'Arraigo por Formacion', 'pending-payment', 'pending', 990, 0)
  await pay(p7a, 990, 'pending')
  const p7b = await proc(u7.id, 'Certificado de Residencia Legal', 'pending-documentation', 'paid', 290, 290)
  await pay(p7b, 290, 'paid', '2026-03-25 16:00:00')
  await doc(p7b, 'Pasaporte o documento identidad', 'uploaded', 'pasaporte-vigente.pdf')
  await doc(p7b, 'Poder notarial autorizado', 'pending')

  // ── U8: Reagrupación cónyuge sola + 2 docs pendientes ────────────────────
  const u8 = await insertUserIfNew({ name: 'Li Wei Zhang', email: 'li.wei.zhang@test.com', phone: '+34 612 008 008', reviewStatus: 'reviewed' })
  await resetUserCases(u8.id)
  const p8 = await proc(u8.id, 'Reagrupacion Familiar Conyuge', 'family-members', 'paid', 1600, 1600)
  await pay(p8, 1600, 'paid', '2026-02-18 12:00:00')
  await fam(p8, 'Mei Zhang', 'Conyuge')
  await doc(p8, 'Certificado de matrimonio apostillado', 'uploaded', 'certificado-matrimonio.pdf')
  await doc(p8, 'Acreditacion de solvencia economica', 'pending')
  await doc(p8, 'Contrato de alquiler vivienda adecuada', 'pending')

  // ── U9: Pago total pendiente + 3 docs pendientes ─────────────────────────
  const u9 = await insertUserIfNew({ name: 'Valentina Kozlov Petrov', email: 'valentina.kozlov@test.com', phone: '+34 612 009 009' })
  await resetUserCases(u9.id)
  const p9 = await proc(u9.id, 'Residencia de Larga Duracion', 'pending-payment', 'pending', 1750, 0)
  await pay(p9, 1750, 'pending')
  await doc(p9, 'Historial de residencia 5 anos', 'pending')
  await doc(p9, 'Declaracion renta IRPF', 'pending')
  await doc(p9, 'Seguro medico vigente', 'pending')

  // ── U10: Mixto — pago parcial + docs mixtos + familiar ───────────────────
  const u10 = await insertUserIfNew({ name: 'Omar Benali Khaled', email: 'omar.benali@test.com', phone: '+34 612 010 010', reviewStatus: 'reviewed' })
  await resetUserCases(u10.id)
  const p10 = await proc(u10.id, 'Modificacion Residencia a Cuenta Ajena', 'family-members', 'pending', 1890, 700)
  await pay(p10, 700, 'paid', '2026-03-10 10:30:00')
  await pay(p10, 1190, 'pending')
  await doc(p10, 'Pasaporte vigente', 'uploaded', 'pasaporte-vigente.pdf')
  await doc(p10, 'Contrato de trabajo indefinido', 'uploaded', 'contrato-trabajo.pdf')
  await doc(p10, 'Vida laboral actualizada', 'pending')
  await doc(p10, 'Nominas ultimos 3 meses', 'pending')
  await fam(p10, 'Nour Benali', 'Hija')

  // eslint-disable-next-line no-console
  console.log('✅ 10 usuarios de testing insertados (idempotente).')
}
