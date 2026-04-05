import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  closeDb,
  DOCS_DIR,
  UPLOADS_DIR,
  exportPortableSnapshot,
  importPortableSnapshot,
  initializeDb,
} from './db.js'

const currentFilePath = fileURLToPath(import.meta.url)
const serverDir = path.dirname(currentFilePath)
const portabilityRoot = path.join(serverDir, 'data-portability')
const defaultBundleDir = path.join(portabilityRoot, 'latest')

const normalizePath = (value = '') => value.replace(/\\/g, '/')

const walkFiles = (baseDir, currentDir = baseDir) => {
  if (!existsSync(currentDir)) {
    return []
  }

  const entries = readdirSync(currentDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const absolutePath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      return walkFiles(baseDir, absolutePath)
    }

    if (!statSync(absolutePath).isFile()) {
      return []
    }

    return [normalizePath(path.relative(baseDir, absolutePath))]
  })
}

const resolveBundleDir = () => {
  const customArg = process.argv[3]
  if (!customArg) {
    return defaultBundleDir
  }

  return path.isAbsolute(customArg) ? customArg : path.resolve(process.cwd(), customArg)
}

const clearDirectory = (dirPath) => {
  rmSync(dirPath, { recursive: true, force: true })
  mkdirSync(dirPath, { recursive: true })
}

const exportBundle = async (bundleDir) => {
  await initializeDb()

  clearDirectory(bundleDir)
  const filesDir = path.join(bundleDir, 'files')
  const docsTarget = path.join(filesDir, 'docs')
  const uploadsTarget = path.join(filesDir, 'uploads')
  mkdirSync(filesDir, { recursive: true })

  if (existsSync(DOCS_DIR)) {
    cpSync(DOCS_DIR, docsTarget, { recursive: true })
  }

  if (existsSync(UPLOADS_DIR)) {
    cpSync(UPLOADS_DIR, uploadsTarget, { recursive: true })
  }

  const snapshot = await exportPortableSnapshot()
  const manifest = {
    format: 'ventura-portable-bundle',
    version: 1,
    exportedAt: snapshot.exportedAt,
    database: snapshot,
    files: {
      docs: walkFiles(docsTarget),
      uploads: walkFiles(uploadsTarget),
    },
  }

  writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  // eslint-disable-next-line no-console
  console.log(`Portable bundle exported to ${bundleDir}`)
}

const importBundle = async (bundleDir) => {
  await initializeDb()

  const manifestPath = path.join(bundleDir, 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Bundle manifest not found at ${manifestPath}`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

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

  // eslint-disable-next-line no-console
  console.log(`Portable bundle imported from ${bundleDir}`)
}

const main = async () => {
  const command = process.argv[2]
  const bundleDir = resolveBundleDir()

  if (!command || !['export', 'import'].includes(command)) {
    throw new Error('Use: node server/data-portability.js <export|import> [bundleDir]')
  }

  if (command === 'export') {
    await exportBundle(bundleDir)
    return
  }

  await importBundle(bundleDir)
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Data portability error:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await closeDb()
    } catch (_error) {
      process.exitCode = 1
    }
  })