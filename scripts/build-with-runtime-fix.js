const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const root = process.cwd()
const nextDir = path.join(root, '.next')
const serverDir = path.join(nextDir, 'server')
const serverChunksDir = path.join(serverDir, 'chunks')
const serverAppDir = path.join(serverDir, 'app')
const serverAppPathsManifest = path.join(serverDir, 'app-paths-manifest.json')

function removeExistingBuildOutput() {
  fs.rmSync(nextDir, { recursive: true, force: true })
}

function collectChunkFiles(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectChunkFiles(fullPath))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

function mirrorServerChunksToRoot() {
  if (!fs.existsSync(serverChunksDir)) return

  for (const sourceFile of collectChunkFiles(serverChunksDir)) {
    const relativePath = path.relative(serverChunksDir, sourceFile)
    if (relativePath.includes(path.sep)) continue

    const targetFile = path.join(serverDir, relativePath)
    try {
      const sourceStat = fs.statSync(sourceFile)
      const targetStat = fs.existsSync(targetFile) ? fs.statSync(targetFile) : null
      if (targetStat && targetStat.size === sourceStat.size) continue
      fs.copyFileSync(sourceFile, targetFile)
    } catch {
      // Best-effort during build; if the file is in flux, the next tick will retry.
    }
  }
}

function collectAppEntrypoints(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = []
  const stack = [dir]

  while (stack.length > 0) {
    const currentDir = stack.pop()
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }

      if (!entry.isFile() || !entry.name.endsWith('.js')) continue

      const normalized = fullPath.replace(/\\/g, '/')
      const isPage = normalized.endsWith('/page.js')
      const isRoute = normalized.endsWith('/route.js')
      if (!isPage && !isRoute) continue

      const relativePath = path.relative(serverDir, fullPath).replace(/\\/g, '/')
      const denormalizedPath = `/${relativePath.replace(/^app\//, '').replace(/\.js$/, '')}`.replace(/\/+/g, '/')
      entries.push([denormalizedPath === '' ? '/' : denormalizedPath, relativePath])
    }
  }

  return entries.sort(([left], [right]) => left.localeCompare(right))
}

function ensureAppPathsManifest() {
  const entries = collectAppEntrypoints(serverAppDir)
  if (entries.length === 0) return

  const nextManifest = Object.fromEntries(entries)

  if (fs.existsSync(serverAppPathsManifest)) {
    try {
      const currentManifest = JSON.parse(fs.readFileSync(serverAppPathsManifest, 'utf8'))
      const currentKeys = Object.keys(currentManifest)
      const nextKeys = Object.keys(nextManifest)
      const isSame =
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => currentManifest[key] === nextManifest[key])
      if (isSame) return
    } catch {
      // Rewrite below.
    }
  }

  fs.mkdirSync(path.dirname(serverAppPathsManifest), { recursive: true })
  fs.writeFileSync(serverAppPathsManifest, `${JSON.stringify(nextManifest, null, 2)}\n`)
}

function maintainBuildArtifacts() {
  mirrorServerChunksToRoot()
  ensureAppPathsManifest()
}

function runBuild() {
  removeExistingBuildOutput()

  const args = [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'build', ...process.argv.slice(2)]
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })

  const mirrorTimer = setInterval(maintainBuildArtifacts, 150)
  mirrorTimer.unref()

  const stop = (code) => {
    clearInterval(mirrorTimer)
    maintainBuildArtifacts()
    process.exit(code)
  }

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    stop(code ?? 1)
  })

  child.on('error', () => {
    stop(1)
  })
}

runBuild()
