#!/usr/bin/env node
/**
 * snapkitty-shell cbom-report
 * Generates a Cryptography Bill of Materials for the current WORM chain.
 *
 * Usage:
 *   node src/crypto/cbom-report.mjs
 *   node src/crypto/cbom-report.mjs --json
 */

import { cbomReport, pqStatus } from '../worm/chain.mjs'

const asJson = process.argv.includes('--json')

const pq     = await pqStatus()
const report = await cbomReport()

if (asJson) {
  console.log(JSON.stringify({ pq_status: pq, cbom: report }, null, 2))
  process.exit(0)
}

const verdict = report.summary?.overall_verdict || 'UNKNOWN'
const verdictColor = verdict === 'POST_QUANTUM_READY' ? '\x1b[32m' : '\x1b[31m'
const reset = '\x1b[0m'
const cyan  = '\x1b[36m'
const gold  = '\x1b[33m'
const dim   = '\x1b[2m'

console.log(`
${cyan}⬡ SNAPKITTY CBOM — CRYPTOGRAPHY BILL OF MATERIALS${reset}
${dim}⬡ Ω ↺ Ψ Δ Λ Σ Φ α${reset}
${'─'.repeat(60)}

${gold}PQ SIGNING LAYER${reset}
  Library:     ${pq.library}
  Algorithm:   ${pq.algorithm} (${pq.nist_standard})
  Available:   ${pq.library_available ? '✓' : '✗ — npm install @noble/post-quantum'}
  Keys:        ${pq.keys_generated ? '✓ generated' : '✗ not yet generated'}
  SHA-256:     ✓ PQ-safe (${pq.sha256_note})
  Full PQ:     ${pq.full_pq ? '✓ HARDENED' : '⚠ SHA-256 only'}

${gold}WORM CHAIN SUMMARY${reset}
  Total seals:     ${report.summary?.total_seals ?? 0}
  PQ-safe seals:   ${report.summary?.pq_safe_seals ?? 0}
  PQ-unsafe seals: ${report.summary?.pq_unsafe_seals ?? 0}
  PQ-safe rate:    ${report.summary?.pq_safe_rate ?? 'N/A'}

${gold}VERDICT${reset}
  ${verdictColor}${verdict}${reset}

${gold}PRIMITIVES IN USE${reset}`)

for (const p of (report.primitives_in_use || [])) {
  const safe = p.pq_safe ? '\x1b[32m✓ PQ-SAFE\x1b[0m' : '\x1b[31m✗ QUANTUM VULNERABLE\x1b[0m'
  console.log(`  ${p.name.padEnd(20)} ${safe}   ${p.count} seals   ${p.nist_standard || ''}`)
}

if (report.deprecated_primitives?.length) {
  console.log(`\n\x1b[31mDEPRECATED PRIMITIVES (quantum vulnerable)\x1b[0m`)
  for (const d of report.deprecated_primitives) {
    console.log(`  ✗ ${d.name}: ${d.quantum_threat}`)
  }
}

console.log(`
${gold}NIST PQC COMPLIANCE${reset}
  ML-KEM  (FIPS 203): ${report.nist_pqc_compliance?.ml_kem  ? '✓' : '○ not in chain'}
  ML-DSA  (FIPS 204): ${report.nist_pqc_compliance?.ml_dsa  ? '✓' : '○ not in chain'}
  SLH-DSA (FIPS 205): ${report.nist_pqc_compliance?.slh_dsa ? '✓' : '○ not in chain'}

${gold}RECOMMENDATION${reset}
  ${pq.recommendation}

${'─'.repeat(60)}
`)
