import sqlite3 from 'sqlite3'

const db = new sqlite3.Database('./server/data/auth.sqlite')

db.all('SELECT id, name, email, provider, created_at FROM users ORDER BY id DESC', (err, rows) => {
  if (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }

  console.log('\n=== USUARIOS REGISTRADOS EN LA BASE DE DATOS ===\n')

  if (!rows || rows.length === 0) {
    console.log('No hay usuarios registrados.')
    process.exit(0)
  }

  rows.forEach((r) => {
    console.log(`ID: ${r.id}`)
    console.log(`Nombre: ${r.name}`)
    console.log(`Email: ${r.email}`)
    console.log(`Provider: ${r.provider}`)
    console.log(`Creado: ${r.created_at}`)
    console.log('---')
  })

  db.close()
})
