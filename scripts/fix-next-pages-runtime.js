const fs = require('fs')
const path = require('path')

const root = process.cwd()
const serverDir = path.join(root, '.next', 'server')
const traceFile = path.join(serverDir, 'pages', '_document.js.nft.json')

if (!fs.existsSync(traceFile)) {
  process.exit(0)
}

const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8'))
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
