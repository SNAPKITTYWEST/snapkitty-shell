/**
 * CBOM — Cryptography Bill of Materials
 *
 * Every WORM seal records WHICH cryptographic primitive sealed it,
 * its post-quantum classification, and NIST PQC status.
 *
 * NIST PQC Final Standards (2024):
 *   ML-KEM  (CRYSTALS-Kyber)   FIPS 203 — key encapsulation
 *   ML-DSA  (CRYSTALS-Dilithium) FIPS 204 — digital signatures
 *   SLH-DSA (SPHINCS+)          FIPS 205 — hash-based signatures
 *
 * Our WORM chain uses SHA-256 for chaining.
 * SHA-256 is post-quantum SAFE (Grover halves to 128-bit — still unbreakable).
 * We add ML-DSA signatures on top for full PQ assurance.
 *
 * ⬡ Ω ↺ Ψ Δ Λ Σ Φ α
 */

// ── Primitive registry ────────────────────────────────────────────────────────
export const PRIMITIVES = {
  'SHA-256': {
    type:           'hash',
    bits:           256,
    pq_bits:        128,       // Grover's algorithm: n/2 effective
    pq_safe:        true,
    nist_standard:  'FIPS 180-4',
    nist_pqc:       null,      // Pre-dates PQC program — inherently safe
    quantum_threat: 'Grover (search speedup only — not a break)',
    status:         'PRODUCTION',
    role:           'chain-link',
  },
  'ML-DSA-65': {
    type:           'signature',
    bits:           256,
    pq_bits:        256,       // Resistant to Shor + Grover
    pq_safe:        true,
    nist_standard:  'FIPS 204',
    nist_pqc:       'ML-DSA (CRYSTALS-Dilithium)',
    quantum_threat: 'None — lattice-based, no quantum speedup known',
    status:         'PRODUCTION',
    role:           'seal-signature',
  },
  'ML-KEM-768': {
    type:           'kem',
    bits:           256,
    pq_bits:        256,
    pq_safe:        true,
    nist_standard:  'FIPS 203',
    nist_pqc:       'ML-KEM (CRYSTALS-Kyber)',
    quantum_threat: 'None — lattice-based',
    status:         'AVAILABLE',
    role:           'key-encapsulation',
  },
  'Ed448-Goldilocks': {
    type:           'signature',
    bits:           448,
    pq_bits:        0,         // Shor's algorithm breaks elliptic curves
    pq_safe:        false,
    nist_standard:  'RFC 8032',
    nist_pqc:       null,
    quantum_threat: "Shor's algorithm — BROKEN by a sufficiently large quantum computer",
    status:         'DEPRECATED_PQ',
    role:           'legacy-signature',
  },
  'RSA-2048': {
    type:           'signature',
    bits:           2048,
    pq_bits:        0,
    pq_safe:        false,
    nist_standard:  'PKCS#1',
    nist_pqc:       null,
    quantum_threat: "Shor's algorithm — BROKEN",
    status:         'DEPRECATED_PQ',
    role:           'legacy-signature',
  },
  'ECDSA-P256': {
    type:           'signature',
    bits:           256,
    pq_bits:        0,
    pq_safe:        false,
    nist_standard:  'FIPS 186-5',
    nist_pqc:       null,
    quantum_threat: "Shor's algorithm — BROKEN",
    status:         'DEPRECATED_PQ',
    role:           'legacy-signature',
  },
}

// ── CBOM entry for a single seal ──────────────────────────────────────────────
export function sealCBOM(options = {}) {
  const {
    chain_primitive  = 'SHA-256',
    sig_primitive    = 'ML-DSA-65',
    has_pq_sig       = false,
    service          = 'snapkitty-shell',
    version          = '0.1.0',
  } = options

  const chain = PRIMITIVES[chain_primitive]
  const sig   = PRIMITIVES[sig_primitive]

  return {
    cbom_version:  '1.0',
    generated:     new Date().toISOString(),
    service,
    version,
    primitives: {
      chain_hash: {
        algorithm:    chain_primitive,
        ...chain,
      },
      seal_signature: has_pq_sig ? {
        algorithm:    sig_primitive,
        ...sig,
      } : {
        algorithm:    'none',
        note:         'PQ signature not applied — chain hash only',
        pq_safe:      chain.pq_safe,
      },
    },
    pq_assessment: {
      overall_pq_safe: chain.pq_safe && (has_pq_sig ? sig.pq_safe : true),
      chain_pq_safe:   chain.pq_safe,
      sig_pq_safe:     has_pq_sig ? sig.pq_safe : null,
      nist_pqc_used:   has_pq_sig ? [sig.nist_pqc] : [],
      quantum_threats: has_pq_sig ? [] : ['No PQ signature — chain integrity only'],
      recommendation:  has_pq_sig
        ? 'FULLY POST-QUANTUM HARDENED'
        : 'PQ-SAFE CHAIN — add ML-DSA signature for full PQ assurance',
    },
  }
}

// ── Full CBOM inventory report for a system ───────────────────────────────────
export function generateCBOMReport(seals = [], systemInfo = {}) {
  const primitiveUsage = {}
  let pqSafeCount   = 0
  let pqUnsafeCount = 0

  for (const seal of seals) {
    const cbom = seal.cbom
    if (!cbom) continue
    const alg = cbom.primitives?.chain_hash?.algorithm || 'unknown'
    primitiveUsage[alg] = (primitiveUsage[alg] || 0) + 1
    if (cbom.pq_assessment?.overall_pq_safe) pqSafeCount++
    else pqUnsafeCount++
  }

  const allPrimitivesUsed = Object.keys(primitiveUsage).map(name => ({
    name,
    count:       primitiveUsage[name],
    ...PRIMITIVES[name],
  }))

  const hasDeprecated = allPrimitivesUsed.some(p => p.status === 'DEPRECATED_PQ')

  return {
    cbom_version:  '1.0',
    report_type:   'SYSTEM_CBOM',
    generated:     new Date().toISOString(),
    system:        systemInfo,
    summary: {
      total_seals:    seals.length,
      pq_safe_seals:  pqSafeCount,
      pq_unsafe_seals: pqUnsafeCount,
      pq_safe_rate:   seals.length ? (pqSafeCount / seals.length).toFixed(4) : 'N/A',
      overall_verdict: hasDeprecated ? 'QUANTUM_VULNERABLE' : 'POST_QUANTUM_READY',
    },
    primitives_in_use: allPrimitivesUsed,
    nist_pqc_compliance: {
      ml_kem:  allPrimitivesUsed.some(p => p.name === 'ML-KEM-768'),
      ml_dsa:  allPrimitivesUsed.some(p => p.name === 'ML-DSA-65'),
      slh_dsa: allPrimitivesUsed.some(p => p.name === 'SLH-DSA'),
    },
    deprecated_primitives: allPrimitivesUsed
      .filter(p => p.status === 'DEPRECATED_PQ')
      .map(p => ({ name: p.name, quantum_threat: p.quantum_threat })),
    seal: '⬡ Ω ↺ Ψ Δ Λ Σ Φ α',
  }
}
