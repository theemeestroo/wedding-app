#!/usr/bin/env node
/**
 * translate-sync.mjs
 *
 * Syncs missing translation keys from en.json → de.json / fr.json using the
 * DeepL API.  Run via:
 *
 *   npm run i18n:sync              # translate missing keys
 *   npm run i18n:check             # preview without calling API (dry-run)
 *
 * Requires DEEPL_API_KEY in .env.local (or as an env var).
 * Uses the free-tier endpoint by default. Set DEEPL_API_PRO=true for the paid
 * endpoint.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')
const SOURCE_LOCALE = 'en'
const TARGET_LOCALES = [
  { code: 'de', deeplLang: 'DE', formality: 'more' },
  { code: 'fr', deeplLang: 'FR', formality: 'default' },
]

/** Max texts per DeepL request (API limit is 50). */
const BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) return
  const lines = readFileSync(path, 'utf-8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) continue
    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(join(ROOT, '.env.local'))

// ---------------------------------------------------------------------------
// JSON helpers — flatten / unflatten nested objects using dot paths
// ---------------------------------------------------------------------------

function flatten(obj, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value, path))
    } else {
      result[path] = String(value)
    }
  }
  return result
}

function unflatten(flat) {
  const result = {}
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split('.')
    let current = result
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }
  return result
}

/**
 * Deep-merge source into target, preferring target values where they exist.
 * Ensures the key order matches source (en.json) for a clean diff.
 */
function orderedMerge(source, target) {
  const result = {}
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = target[key]
    if (typeof sv === 'object' && sv !== null && !Array.isArray(sv)) {
      result[key] = orderedMerge(
        sv,
        typeof tv === 'object' && tv !== null ? tv : {},
      )
    } else {
      result[key] = tv !== undefined ? tv : sv // prefer existing translation
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Interpolation-token protection
//
// Wraps {{varName}} in <x id="varName"/> so DeepL preserves them (with
// tag_handling=xml).  After translation we unwrap back to {{varName}}.
// ---------------------------------------------------------------------------

const TOKEN_RE = /\{\{(\w+)\}\}/g

function protectTokens(text) {
  return text.replace(TOKEN_RE, (_, name) => `<x id="${name}"/>`)
}

function restoreTokens(text) {
  // Handle both self-closing and open/close forms that DeepL may produce
  return text
    .replace(/<x id="(\w+)"\/>/g, (_, name) => `{{${name}}}`)
    .replace(/<x id="(\w+)">(\s*)<\/x>/g, (_, name) => `{{${name}}}`)
}

// ---------------------------------------------------------------------------
// DeepL API
// ---------------------------------------------------------------------------

async function translateBatch(texts, targetLang, formality, apiKey, apiBase) {
  const body = {
    text: texts.map(protectTokens),
    source_lang: 'EN',
    target_lang: targetLang,
    tag_handling: 'xml',
    ignore_tags: ['x'],
  }
  if (formality !== 'default') {
    body.formality = formality
  }

  const res = await fetch(`${apiBase}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`DeepL API error ${res.status}: ${detail}`)
  }

  const json = await res.json()
  return json.translations.map((t) => restoreTokens(t.text))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const apiKey = process.env.DEEPL_API_KEY
  const apiBase =
    process.env.DEEPL_API_PRO === 'true'
      ? 'https://api.deepl.com'
      : 'https://api-free.deepl.com'

  if (!dryRun && !apiKey) {
    console.error(
      '❌  DEEPL_API_KEY is not set. Add it to .env.local or export it as an env var.\n' +
        '    Run with --dry-run to preview missing keys without translating.',
    )
    process.exit(1)
  }

  // Load source
  const sourcePath = join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`)
  const sourceObj = JSON.parse(readFileSync(sourcePath, 'utf-8'))
  const sourceFlat = flatten(sourceObj)

  let totalAdded = 0

  for (const { code, deeplLang, formality } of TARGET_LOCALES) {
    const targetPath = join(MESSAGES_DIR, `${code}.json`)
    const targetObj = existsSync(targetPath)
      ? JSON.parse(readFileSync(targetPath, 'utf-8'))
      : {}
    const targetFlat = flatten(targetObj)

    // Find missing keys
    const missingKeys = Object.keys(sourceFlat).filter((k) => !(k in targetFlat))

    if (missingKeys.length === 0) {
      console.log(
        `✅  ${code}.json — all ${Object.keys(sourceFlat).length} keys present`,
      )
      continue
    }

    console.log(`\n🔍  ${code}.json — ${missingKeys.length} missing key(s):`)
    for (const k of missingKeys) {
      console.log(`    + ${k}  →  "${sourceFlat[k]}"`)
    }

    if (dryRun) {
      totalAdded += missingKeys.length
      continue
    }

    // Translate in batches
    const missingValues = missingKeys.map((k) => sourceFlat[k])
    const translated = []

    for (let i = 0; i < missingValues.length; i += BATCH_SIZE) {
      const batch = missingValues.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missingValues.length / BATCH_SIZE)
      console.log(
        `    ⏳ Translating batch ${batchNum}/${totalBatches} (${batch.length} strings)…`,
      )
      const results = await translateBatch(
        batch,
        deeplLang,
        formality,
        apiKey,
        apiBase,
      )
      translated.push(...results)
    }

    // Merge translations
    for (let i = 0; i < missingKeys.length; i++) {
      targetFlat[missingKeys[i]] = translated[i]
      console.log(`    ✓ ${missingKeys[i]}  →  "${translated[i]}"`)
    }

    // Rebuild target JSON with en.json key order
    const mergedObj = unflatten(targetFlat)
    const ordered = orderedMerge(sourceObj, mergedObj)
    writeFileSync(targetPath, JSON.stringify(ordered, null, 2) + '\n', 'utf-8')

    console.log(`    💾 Wrote ${targetPath}`)
    totalAdded += missingKeys.length
  }

  // Summary
  console.log('')
  if (totalAdded === 0) {
    console.log('🎉  All translations are in sync — nothing to do.')
  } else if (dryRun) {
    console.log(`📋  Dry run complete — ${totalAdded} key(s) would be translated.`)
    console.log('    Run without --dry-run to apply.')
  } else {
    console.log(`✅  Done — ${totalAdded} key(s) translated and written.`)
    console.log('    Review the changes before committing.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
