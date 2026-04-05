import path from 'node:path'
import sqlite3 from 'sqlite3'
import { initializeDb } from './db.js'

const dbPath = path.join(process.cwd(), 'server', 'data', 'auth.sqlite')
const db = new sqlite3.Database(dbPath)

export const run = (query, params = []) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (error) {
      if (error) {
        reject(error)
        return
      }

      resolve({ lastInsertRowid: this.lastID })
    })
  })

console.log('🌱 Seeding test data...')

const seedData = async () => {
  try {
    // Initialize database tables first
    await initializeDb()

  // Case 1: Arraigo Familiar - Pending Payment
    const proc1Result = await run(
    `
      INSERT INTO procedures (user_id, title, type, status, payment_status, total_amount, paid_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [1, 'Arraigo Familiar', 'Arraigo', 'active', 'pending', 500, 0],
  )

    await run(
    'INSERT INTO payments (procedure_id, amount, status) VALUES (?, ?, ?)',
    [proc1Result.lastInsertRowid, 500, 'pending'],
  )

    console.log('✓ Case 1: Arraigo Familiar (Pending payment)')

    // Case 2: Visado de Estudios - Requires Documentation
    const proc2Result = await run(
    `
      INSERT INTO procedures (user_id, title, type, status, payment_status, total_amount, paid_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [1, 'Visado de Estudios', 'Estudios', 'active', 'pending', 300, 300],
  )

    await run(
    'INSERT INTO payments (procedure_id, amount, status, payment_date) VALUES (?, ?, ?, ?)',
    [proc2Result.lastInsertRowid, 300, 'completed', new Date().toISOString()],
  )

    await run(
    'INSERT INTO documentation (procedure_id, title, status) VALUES (?, ?, ?)',
    [proc2Result.lastInsertRowid, 'Certificado de Admisión', 'pending'],
  )

    await run(
    'INSERT INTO documentation (procedure_id, title, status) VALUES (?, ?, ?)',
    [proc2Result.lastInsertRowid, 'Prueba de Solvencia Económica', 'pending'],
  )

    console.log('✓ Case 2: Visado de Estudios (Pending documentation)')

    // Case 3: Residencia No Lucrativa - Multiple Family Members
    const proc3Result = await run(
    `
      INSERT INTO procedures (user_id, title, type, status, payment_status, total_amount, paid_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [1, 'Residencia No Lucrativa', 'Residencia', 'active', 'completed', 400, 400],
  )

    await run(
    'INSERT INTO payments (procedure_id, amount, status, payment_date) VALUES (?, ?, ?, ?)',
    [proc3Result.lastInsertRowid, 400, 'completed', new Date().toISOString()],
  )

    await run(
    'INSERT INTO family_members (procedure_id, name, relationship, status) VALUES (?, ?, ?, ?)',
    [proc3Result.lastInsertRowid, 'María García', 'Cónyuge', 'pending'],
  )

    await run(
    'INSERT INTO family_members (procedure_id, name, relationship, status) VALUES (?, ?, ?, ?)',
    [proc3Result.lastInsertRowid, 'Carlos García', 'Hijo', 'pending'],
  )

    console.log('✓ Case 3: Residencia No Lucrativa (Multiple family members)')
    console.log('\n✅ Test data seeded successfully!')
    console.log('\nDashboard test scenarios created:')
    console.log('1. Yellow Alert - Pending payment of €500')
    console.log('2. Green Alert - Pending documentation upload')
    console.log('3. Blue Alert - 2 family members to add')
  } catch (error) {
    console.error('❌ Error seeding data:', error.message)
  }

  db.close()
}

seedData()
