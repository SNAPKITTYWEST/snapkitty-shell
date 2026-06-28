/**
 * SNAPKITTY SHELL — WORM Chain (file-based, no DB required)
 * Append-only SHA-256 chained ledger for all shell executions.
 * Works standalone without PostgreSQL.
 */

import { createHash } from 'crypto'
import { appendFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir   = dirname(fileURLToPath(import.meta.url))
const WORM_FILE = join(__dir, '../../../.worm/shell_chain.jsonl')

// Ensure dir exists
import { mkdirSync } from 'fs'
mkdirSync(join(__dir, '../../../.worm'), { recursive: true })

let _prevHash = ''

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

export async function wormSeal(payload) {
  const entry = {
    seq:       Date.now(),
    ts:        new Date().toISOString(),
    prev_hash: _prevHash,
    payload,
    this_hash: hash({ prev: _prevHash, ...payload }),
  }
  _prevHash = entry.this_hash
  appendFileSync(WORM_FILE, JSON.stringify(entry) + '\n')
  return entry
}

export function readWorm(limit = 50) {
  if (!existsSync(WORM_FILE)) return { chain: [], total: 0 }
  const lines = readFileSync(WORM_FILE, 'utf8')
    .trim().split('\n').filter(Boolean)
  const chain = lines.slice(-limit).map(l => {
    try { return JSON.parse(l) } catch { return null }
  }).filter(Boolean).reverse()
  return { chain, total: lines.length }
}

export function verifyChain() {
  if (!existsSync(WORM_FILE)) return { valid: true, entries: 0 }
  const lines = readFileSync(WORM_FILE, 'utf8').trim().split('\n').filter(Boolean)
  let prev = ''
  let broken = null
  for (const line of lines) {
    const entry = JSON.parse(line)
    const expected = hash({ prev, ...entry.payload })
    if (entry.this_hash !== expected || entry.prev_hash !== prev) {
      broken = entry.seq
      break
    }
    prev = entry.this_hash
  }
  return { valid: !broken, broken, entries: lines.length }
}
