/**
 * Post-Quantum Signing Layer — ML-DSA (CRYSTALS-Dilithium) FIPS 204
 *
 * Wraps @noble/post-quantum for ML-DSA-65 signatures on WORM seals.
 * Each seal gets:
 *   1. SHA-256 chain link  (tamper detection — already PQ safe)
 *   2. ML-DSA-65 signature (post-quantum signature proof)
 *
 * Key pair is generated once at startup and stored in .sovereign/pq-keys.json
 * In production: load from AWS Secrets Manager or HashiCorp Vault.
 *
 * ML-DSA security level 2 (Dilithium3):
 *   Classical security: ~178 bits
 *   Post-quantum security: ~128 bits (NIST Level 3)
 *   Signature size: 3309 bytes
 *   Public key size: 1952 bytes
 */

import { createHash, randomBytes } from 'crypto'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const KEY_DIR  = join(process.cwd(), '.sovereign')
const KEY_FILE = join(KEY_DIR, 'pq-keys.json')

// ── Lazy-load @noble/post-quantum ─────────────────────────────────────────────
let _ml_dsa = null
async function getMlDsa() {
  if (_ml_dsa) return _ml_dsa
  try {
    const pkg = await import('@noble/post-quantum/ml-dsa')
    _ml_dsa = pkg.ml_dsa65
    return _ml_dsa
  } catch {
    return null  // graceful degradation — PQ not installed yet
  }
}

// ── Key management ────────────────────────────────────────────────────────────
export async function loadOrGenerateKeys() {
  const ml_dsa = await getMlDsa()
  if (!ml_dsa) {
    console.warn('[PQ] @noble/post-quantum not installed — run: npm install @noble/post-quantum')
    console.warn('[PQ] Falling back to SHA-256 chain only (still PQ-safe for tamper detection)')
    return null
  }

  if (existsSync(KEY_FILE)) {
    const raw  = JSON.parse(await readFile(KEY_FILE, 'utf8'))
    return {
      publicKey:  Buffer.from(raw.publicKey, 'hex'),
      secretKey:  Buffer.from(raw.secretKey, 'hex'),
      algorithm:  'ML-DSA-65',
      nist:       'FIPS 204',
    }
  }

  // Generate fresh keypair
  const seed = randomBytes(32)
  const keys  = ml_dsa.keygen(seed)
  if (!existsSync(KEY_DIR)) await mkdir(KEY_DIR, { recursive: true })
  await writeFile(KEY_FILE, JSON.stringify({
    algorithm:  'ML-DSA-65',
    nist:       'FIPS 204',
    publicKey:  Buffer.from(keys.publicKey).toString('hex'),
    secretKey:  Buffer.from(keys.secretKey).toString('hex'),
    generated:  new Date().toISOString(),
  }, null, 2))

  console.log('[PQ] ML-DSA-65 keypair generated → .sovereign/pq-keys.json')
  return { ...keys, algorithm: 'ML-DSA-65', nist: 'FIPS 204' }
}

// ── Sign a seal hash ──────────────────────────────────────────────────────────
export async function signSeal(sealHash, keys) {
  if (!keys) return null

  const ml_dsa = await getMlDsa()
  if (!ml_dsa) return null

  const msg = Buffer.from(sealHash, 'hex')
  const sig = ml_dsa.sign(keys.secretKey, msg)

  return {
    algorithm:  'ML-DSA-65',
    nist:       'FIPS 204',
    signature:  Buffer.from(sig).toString('hex').slice(0, 32) + '...',  // truncated for storage
    sig_full:   Buffer.from(sig).toString('hex'),
    pq_safe:    true,
    quantum_threat: 'none',
  }
}

// ── Verify a seal signature ───────────────────────────────────────────────────
export async function verifySeal(sealHash, sigHex, publicKeyHex) {
  const ml_dsa = await getMlDsa()
  if (!ml_dsa) return { valid: null, reason: 'PQ library not installed' }

  try {
    const msg       = Buffer.from(sealHash, 'hex')
    const sig       = Buffer.from(sigHex, 'hex')
    const publicKey = Buffer.from(publicKeyHex, 'hex')
    const valid     = ml_dsa.verify(publicKey, msg, sig)
    return { valid, algorithm: 'ML-DSA-65', nist: 'FIPS 204' }
  } catch (err) {
    return { valid: false, reason: err.message }
  }
}

// ── PQ status check ───────────────────────────────────────────────────────────
export async function pqStatus() {
  const ml_dsa    = await getMlDsa()
  const hasKeys   = existsSync(KEY_FILE)

  return {
    library_available: !!ml_dsa,
    library:           '@noble/post-quantum',
    algorithm:         'ML-DSA-65',
    nist_standard:     'FIPS 204',
    keys_generated:    hasKeys,
    sha256_pq_safe:    true,
    sha256_note:       'SHA-256 chain is PQ-safe (Grover → 128-bit effective)',
    full_pq:           !!ml_dsa && hasKeys,
    recommendation:    !!ml_dsa && hasKeys
      ? 'FULLY POST-QUANTUM HARDENED — SHA-256 chain + ML-DSA-65 signatures'
      : 'INSTALL: npm install @noble/post-quantum — then keys auto-generate on first run',
  }
}
