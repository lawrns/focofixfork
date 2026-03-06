const fs = require('fs')
const path = require('path')

const root = process.cwd()
const serverDir = path.join(root, '.next', 'server')
const traceFile = path.join(serverDir, 'pages', '_document.js.nft.json')
const vendorDir = path.join(serverDir, 'vendor-chunks')
const chunksDir = path.join(serverDir, 'chunks')
const appDir = path.join(serverDir, 'app')
const serverAppPathsManifest = path.join(serverDir, 'app-paths-manifest.json')

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function collectServerJsFiles(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectServerJsFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

function collectAppEntrypoints(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }

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

      const normalizedPath = fullPath.replace(/\\/g, '/')
      if (!entry.isFile() || !/\/(page|route)\.js$/.test(normalizedPath)) {
        continue
      }

      const relativePath = path.relative(serverDir, fullPath).replace(/\\/g, '/')
      const routeId = `/${relativePath.replace(/^app\//, '').replace(/\.js$/, '')}`
      entries.push([routeId, relativePath])
    }
  }

  return entries.sort(([left], [right]) => left.localeCompare(right))
}

function ensureServerAppPathsManifest() {
  const entries = collectAppEntrypoints(appDir)
  if (entries.length === 0) {
    return 0
  }

  let current = {}
  if (fs.existsSync(serverAppPathsManifest)) {
    current = readJson(serverAppPathsManifest)
  }

  if (Object.keys(current).length === entries.length) {
    return entries.length
  }

  const manifest = Object.fromEntries(entries)
  fs.writeFileSync(serverAppPathsManifest, `${JSON.stringify(manifest, null, 2)}\n`)
  return entries.length
}

function extractVendorChunkIds(text) {
  return Array.from(text.matchAll(/vendor-chunks\/[^"'\],)]+/g), (match) => match[0])
}

function buildVendorChunkSource(alias, chunkFiles) {
  const importLines = chunkFiles
    .map((chunkFile, index) => {
      const relativeChunkPath = path
        .relative(vendorDir, chunkFile)
        .replace(/\\/g, '/')
        .replace(/^(?!\.)/, './')
      return `const chunk${index} = require(${JSON.stringify(relativeChunkPath)})`
    })
    .join('\n')

  const mergeLines = chunkFiles
    .map((_, index) => `Object.assign(modules, chunk${index}.modules || {})`)
    .join('\n')

  const runtimeLines = chunkFiles
    .map((_, index) => `if (typeof chunk${index}.runtime === 'function') runtimes.push(chunk${index}.runtime)`)
    .join('\n')

  return `'use strict'\n${importLines}\n\nconst modules = {}\n${mergeLines}\n\nconst runtimes = []\n${runtimeLines}\n\nmodule.exports = {\n  id: ${JSON.stringify(alias)},\n  ids: [${JSON.stringify(alias)}],\n  modules,\n  runtime: runtimes.length\n    ? (__webpack_require__) => {\n        for (const runtime of runtimes) {\n          runtime(__webpack_require__)\n        }\n      }\n    : undefined,\n}\n`
}

function signatureForAlias(alias) {
  const name = alias.replace(/^vendor-chunks\//, '')
  return `/node_modules/${name}/`
}

function ensureVendorChunkAliases() {
  if (!fs.existsSync(chunksDir) && !fs.existsSync(vendorDir)) {
    return []
  }

  const serverFiles = collectServerJsFiles(serverDir)
  const requestedAliases = new Set()

  for (const file of serverFiles) {
    if (file.startsWith(vendorDir)) {
      continue
    }

    const text = fs.readFileSync(file, 'utf8')
    for (const alias of extractVendorChunkIds(text)) {
      requestedAliases.add(alias)
    }
  }

  const chunkFiles = [
    ...(fs.existsSync(chunksDir)
      ? fs
          .readdirSync(chunksDir)
          .filter((entry) => entry.endsWith('.js'))
          .map((entry) => path.join(chunksDir, entry))
      : []),
    ...(fs.existsSync(vendorDir)
      ? fs
          .readdirSync(vendorDir)
          .filter((entry) => entry.endsWith('.js'))
          .map((entry) => path.join(vendorDir, entry))
      : []),
  ]

  const chunkContents = chunkFiles.map((file) => ({
    file,
    text: fs.readFileSync(file, 'utf8'),
  }))

  const createdAliases = []

  for (const alias of Array.from(requestedAliases).sort()) {
    const aliasName = alias.replace(/^vendor-chunks\//, '')
    const targetFile = path.join(vendorDir, `${aliasName}.js`)
    if (fs.existsSync(targetFile)) {
      continue
    }

    const signature = signatureForAlias(alias)
    const matchedChunks = chunkContents
      .filter(({ text }) => text.includes(signature))
      .map(({ file }) => file)

    fs.mkdirSync(path.dirname(targetFile), { recursive: true })
    fs.writeFileSync(targetFile, buildVendorChunkSource(alias, matchedChunks))
    createdAliases.push(aliasName)
  }

  return createdAliases
}

function ensureServerRootChunkMirrors() {
  if (!fs.existsSync(chunksDir)) {
    return 0
  }

  let mirrored = 0
  for (const entry of fs.readdirSync(chunksDir)) {
    if (!entry.endsWith('.js')) {
      continue
    }

    const sourceFile = path.join(chunksDir, entry)
    const targetFile = path.join(serverDir, entry)

    if (!fs.existsSync(targetFile)) {
      fs.copyFileSync(sourceFile, targetFile)
      mirrored += 1
    }
  }

  return mirrored
}

if (!fs.existsSync(traceFile)) {
  const createdAliases = ensureVendorChunkAliases()
  const mirroredChunks = ensureServerRootChunkMirrors()
  const appManifestCount = ensureServerAppPathsManifest()
  if (createdAliases.length > 0) {
    console.log(`[postbuild] synthesized vendor chunk aliases: ${createdAliases.join(', ')}`)
  }
  if (mirroredChunks > 0) {
    console.log(`[postbuild] mirrored ${mirroredChunks} server chunks into root runtime directory`)
  }
  if (appManifestCount > 0) {
    console.log(`[postbuild] ensured server app paths manifest with ${appManifestCount} entries`)
  }
  process.exit(0)
}

const trace = readJson(traceFile)
const chunkRef = Array.isArray(trace.files)
  ? trace.files.find((file) => typeof file === 'string' && file.startsWith('../chunks/') && file.endsWith('.js'))
  : null

if (!chunkRef) {
  process.exit(0)
}

const sourceChunk = path.join(serverDir, chunkRef.replace(/^\.\.\//, ''))
if (!fs.existsSync(sourceChunk)) {
  process.exit(0)
}

const copies = [
  path.join(serverDir, path.basename(sourceChunk)),
  path.join(serverDir, 'vendor-chunks', '@opentelemetry.js'),
]

for (const target of copies) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(sourceChunk, target)
}

console.log(`[postbuild] mirrored ${path.basename(sourceChunk)} for pages runtime compatibility`)

const createdAliases = ensureVendorChunkAliases()
if (createdAliases.length > 0) {
  console.log(`[postbuild] synthesized vendor chunk aliases: ${createdAliases.join(', ')}`)
}

const mirroredChunks = ensureServerRootChunkMirrors()
if (mirroredChunks > 0) {
  console.log(`[postbuild] mirrored ${mirroredChunks} server chunks into root runtime directory`)
}

const appManifestCount = ensureServerAppPathsManifest()
if (appManifestCount > 0) {
  console.log(`[postbuild] ensured server app paths manifest with ${appManifestCount} entries`)
}
