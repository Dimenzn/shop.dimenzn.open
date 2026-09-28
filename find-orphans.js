import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// --- ESM PATH HELPERS ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- CONFIGURATION ---
const LOCALES_PATH = './sampleDB/languages.json'
const SEARCH_DIRS = ['./src', './src-server']
const FILE_EXTENSIONS = ['.vue', '.js', '.ts']

// 1. Flatten JSON to find all unique keys
function getDeepKeys(obj) {
  let keys = []
  for (let key in obj) {
    keys.push(key)
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getDeepKeys(obj[key]))
    }
  }
  return [...new Set(keys)]
}

// 2. Recursively find source files
function getFiles(dir, allFiles = []) {
  if (!fs.existsSync(dir)) return allFiles
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const name = path.join(dir, file)
    if (
      name.includes('node_modules') ||
      name.includes('.git') ||
      name.includes('.nuxt') ||
      name.includes('.output')
    )
      return

    if (fs.statSync(name).isDirectory()) {
      getFiles(name, allFiles)
    } else if (FILE_EXTENSIONS.includes(path.extname(name))) {
      allFiles.push(name)
    }
  })
  return allFiles
}

// 3. Recursive Delete Function (Safe Mode: Only deletes strings)
function removeKeysFromObject(obj, keysToRemove) {
  let deletedCount = 0
  for (const key in obj) {
    // Check children first
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      deletedCount += removeKeysFromObject(obj[key], keysToRemove)
    }

    // Check current key
    if (keysToRemove.includes(key)) {
      // SAFETY CHECK: Only delete if it's a string (translation), NOT a category object
      if (typeof obj[key] !== 'object') {
        delete obj[key]
        deletedCount++
      }
    }
  }
  return deletedCount
}

// --- EXECUTION ---
try {
  const absoluteLocalesPath = path.resolve(__dirname, LOCALES_PATH)

  // Load JSON
  const rawData = JSON.parse(fs.readFileSync(absoluteLocalesPath, 'utf8'))
  const enUS = rawData.find(l => l.value === 'en-US')?.i18n
  if (!enUS) throw new Error('Could not find en-US in the JSON file.')

  // Scan Keys
  const masterKeys = getDeepKeys(enUS)

  // Scan Files
  let sourceFiles = []
  SEARCH_DIRS.forEach(targetDir => {
    sourceFiles = sourceFiles.concat(getFiles(path.resolve(__dirname, targetDir)))
  })

  const fileContents = sourceFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n')

  console.log(`\n🔍 Scanning ${masterKeys.length} keys across ${sourceFiles.length} files...`)

  // Identify Orphans
  const unused = masterKeys.filter(key => {
    const regex = new RegExp(`\\b${key}\\b`)
    return !regex.test(fileContents)
  })

  if (unused.length === 0) {
    console.log('\n✅ JSON is clean. No action needed.')
    process.exit(0)
  }

  // --- REPORTING ---
  console.log('\n❌ UNUSED KEYS FOUND:')
  console.log('-----------------------')
  unused.sort().forEach(k => console.log(` - ${k}`))
  console.log('-----------------------')
  console.log(`Total: ${unused.length} orphans.`)

  // --- DELETION LOGIC ---
  if (process.argv.includes('delete')) {
    console.log('\n🗑️  Cleaning up...')

    let totalRemoved = 0

    // Iterate over ALL languages in the file (en-US, de-DE, etc.) and clean them
    rawData.forEach(lang => {
      if (lang.i18n) {
        const removed = removeKeysFromObject(lang.i18n, unused)
        if (lang.value === 'en-US') totalRemoved = removed // Just track one for count
      }
    })

    // Write back to file
    fs.writeFileSync(absoluteLocalesPath, JSON.stringify(rawData, null, 2), 'utf8')
    console.log(`✅ Successfully removed ${totalRemoved} keys from ALL languages.`)
    console.log(`💾 Updated file: ${LOCALES_PATH}`)
  } else {
    console.log('\n💡 To delete these keys automatically, run:')
    console.log('   node find-orphans.js delete')
  }
} catch (err) {
  console.error('\n⛔ ERROR:', err.message)
}
