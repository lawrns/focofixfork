#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function main() {
  const src = path.join(process.cwd(), 'legacy_content')
  const destAssets = path.join(process.cwd(), 'public', 'legacy')
  if (!fs.existsSync(src)) {
    console.log('No legacy_content directory found')
    process.exit(0)
  }
  fs.mkdirSync(destAssets, { recursive: true })
  for (const file of fs.readdirSync(src)) {
    const from = path.join(src, file)
    const to = path.join(destAssets, file)
    fs.copyFileSync(from, to)
  }
  console.log('Migrated assets to public/legacy')
}

main()

