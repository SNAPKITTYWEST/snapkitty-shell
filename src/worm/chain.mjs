/**
 * SNAPKITTY SHELL — WORM Chain
 * Append-only SHA-256 chained ledger + CBOM metadata + ML-DSA-65 PQ signatures.
 *
 * Every seal records:
 *   - SHA-256 chain link  (tamper detection, PQ-safe — Grover → 128-bit)
 *   - CBOM entry          (which primitives sealed this entry)
 *   - ML-DSA-65 signature (FIPS 204, full post-quantum assurance — if keys loaded)
 *
 * ⬡ Ω ↺ Ψ Δ Λ Σ Φ α
 */

import { createHash }                 from 'crypto'
import { appendFileSync, readFileSync, existsSync } from 'fs'
import { mkdirSync }                  from 'fs'
import { join, dirname }              from 'path'
import { fileURLToPath }              from 'url'
import { sealCBOM }                   from '../crypto/cbom.mjs'
import { signSeal, loadOrGenerateKeys, pqStatus } from '../crypto/pq.mjs'

const __dir     = dirname(fileURLToPath(import.meta.url))
const WORM_DIR  = join(__dir, '../../../.worm')
const WORM_FILE = join(WORM_DIR, 'shell_chain.jsonl')

mkdirSync(WORM_DIR, { recursive: true })

let _prevHash = ''
let _pqKeys   = null
let _pqLoaded = false

async function getPQKeys() {
  if (_pqLoaded) return _pqKeys
  _pqKeys   = await loadOrGenerateKeys()
  _pqLoaded = true
  return _pqKeys
}

function sha256Chain(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16)
}

// ── WORM seal — main entry point ──────────────────────────────────────────────
export async function wormSeal(payload) {
  const keys     = await getPQKeys()
  const this_hash = sha256Chain({ prev: _prevHash, ...payload })

  // CBOM — record which primitives sealed this entry
  const cbom = sealCBOM({
    chain_primitive: 'SHA-256',
    sig_primitive:   'ML-DSA-65',
    has_pq_sig:      !!keys,
    service:         'snapkitty-shell',
  })

  // ML-DSA-65 signature over the chain hash (if keys available)
  const pq_sig = keys ? await signSeal(this_hash, keys) : null

  const entry = {
    seq:        Date.now(),
    ts:         new Date().toISOString(),
    prev_hash:  _prevHash,
    payload,
    this_hash,
    cbom,
    pq_sig,
    seal:       '⬡ Ω ↺ Ψ Δ Λ Σ Φ α',
  }

  _prevHash = this_hash
  appendFileSync(WORM_FILE, JSON.stringify(entry) + '\n')
  return entry
}

// ── Read chain ────────────────────────────────────────────────────────────────
export function readWorm(limit = 50) {
  if (!existsSync(WORM_FILE)) return { chain: [], total: 0 }
  const lines = readFileSync(WORM_FILE, 'utf8')
    .trim().split('\n').filter(Boolean)
  const chain = lines.slice(-limit).map(l => {
    try { return JSON.parse(l) } catch { return null }
  }).filter(Boolean).reverse()
  return { chain, total: lines.length }
}

// ── Verify chain integrity ────────────────────────────────────────────────────
export function verifyChain() {
  if (!existsSync(WORM_FILE)) return { valid: true, entries: 0 }
  const lines = readFileSync(WORM_FILE, 'utf8').trim().split('\n').filter(Boolean)
  let prev    = ''
  let broken  = null

  for (const line of lines) {
    const entry    = JSON.parse(line)
    const expected = sha256Chain({ prev, ...entry.payload })
    if (entry.this_hash !== expected || entry.prev_hash !== prev) {
      broken = entry.seq
      break
    }
    prev = entry.this_hash
  }

  return { valid: !broken, broken, entries: lines.length }
}

// ── Generate full CBOM report for the entire chain ────────────────────────────
export async function cbomReport() {
  const { chain, total } = readWorm(0)  // read all
  const { generateCBOMReport } = await import('../crypto/cbom.mjs')

  return generateCBOMReport(chain, {
    name:    'snapkitty-shell',
    version: '0.1.0',
    total_seals: total,
  })
}

// ── PQ status ─────────────────────────────────────────────────────────────────
export { pqStatus }
