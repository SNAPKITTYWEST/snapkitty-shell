# SnapKitty Shell

**Sovereign agentic shell execution framework.**

Backtick executor, command registry, workflow DSL, governance gate, WORM-sealed command ledger with post-quantum signatures.

---

## How It Works

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    INPUT SOURCES                                 │
  │                                                                  │
  │  ┌─────────┐    ┌──────────┐    ┌─────────┐    ┌─────────────┐ │
  │  │ sk CLI  │    │ REST API │    │ Agent   │    │ skrun CLI   │ │
  │  │ bin/sk  │    │ POST/run │    │ prompt  │    │ bin/skrun   │ │
  │  └────┬────┘    └────┬─────┘    └────┬────┘    └──────┬──────┘ │
  └───────┼──────────────┼───────────────┼────────────────┼─────────┘
          │              │               │                │
          v              v               v                v
  ┌──────────────────────────────────────────────────────────────────┐
  │                    BACKTICK EXECUTOR                             │
  │                                                                  │
  │  "The git status is: `git.status`"                              │
  │  "Search TODOs: `grep.pattern pattern=TODO path=./src`"         │
  │                                                                  │
  │  1. Parse backtick blocks from text                             │
  │  2. Resolve command key → shell command                         │
  │  3. Pass through GOVERNANCE GATE                                │
  │  4. Execute in subprocess (timeout 30s, 512KB max buffer)      │
  │  5. WORM-SEAL the execution                                     │
  │  6. Replace backtick with output                                │
  └──────────────────────────────────────────────────────────────────┘
          │
          v
  ┌──────────────────────────────────────────────────────────────────┐
  │                GOVERNANCE GATE                                   │
  │                                                                  │
  │  BLOCKED:  rm -rf /, format c:, drop database, fork bomb,      │
  │            truncate worm_chain, dd if=/dev/zero                 │
  │                                                                  │
  │  CONFIRM:  git.push, gh.repo.create, gh.release,               │
  │            sys.kill, docker.down, psql.cmd                      │
  │                                                                  │
  │  WARN:     Commands marked safe:false                            │
  └──────────────────────────────────────────────────────────────────┘
          │
          v
  ┌──────────────────────────────────────────────────────────────────┐
  │                  COMMAND REGISTRY                                │
  │                                                                  │
  │  100+ commands across 14 tags:                                   │
  │                                                                  │
  │  git    gh    search   rust     node    python    docker        │
  │  db     http  net      aws      sys     asm       lean  file   │
  │                                                                  │
  │  Every command:                                                  │
  │  - tagged by domain                                              │
  │  - marked safe / destructive / confirm-required                 │
  │  - composable in workflows                                      │
  │  - WORM-logged on execution                                     │
  │  - supports template interpolation: {key} placeholders          │
  └──────────────────────────────────────────────────────────────────┘
          │
          v
  ┌──────────────────────────────────────────────────────────────────┐
  │                    WORM CHAIN                                    │
  │                                                                  │
  │  Append-only SHA-256 chained ledger.                            │
  │  Every execution produces a sealed receipt:                     │
  │                                                                  │
  │  ┌──────────────────────────────────────────────────────────┐   │
  │  │ {                                                        │   │
  │  │   seq: 1720131000000,                                   │   │
  │  │   ts: "2026-07-04T22:30:00Z",                           │   │
  │  │   prev_hash: "a8d9c0...",                                │   │
  │  │   payload: { event: "SHELL_EXEC", cmd: "git status",    │   │
  │  │              key: "git.status", ms: 45, ok: true },      │   │
  │  │   this_hash: "7f3a1b...",                                │   │
  │  │   cbom: { chain: "SHA-256", sig: "ML-DSA-65",           │   │
  │  │           pq_safe: true },                                │   │
  │  │   pq_sig: { algorithm: "ML-DSA-65", sig_full: "..." }   │   │
  │  │ }                                                        │   │
  │  └──────────────────────────────────────────────────────────┘   │
  │                                                                  │
  │  Chain integrity: each receipt hashes prev → tamper-proof.      │
  │  Post-quantum: ML-DSA-65 (FIPS 204) signatures on every seal. │
  │  CBOM: tracks which primitives sealed each entry.               │
  └──────────────────────────────────────────────────────────────────┘
```

## Workflow Runner

JSON workflows define multi-step agent tasks. Steps can be sequential, parallel, or conditional.

```
  ┌─────────────────────────────────────────────────────────────┐
  │  WORKFLOW: audit-repo                                       │
  │                                                             │
  │  Step 1: git.status                                         │
  │  Step 2: git.log                                            │
  │  Step 3: grep.pattern (TODO|FIXME|HACK)                    │
  │  Step 4: ── PARALLEL ──┬── npm.audit                       │
  │                        └── npm.test                        │
  │  Step 5: sys.gpu                                            │
  │  Step 6: gh.repo.list                                       │
  │                                                             │
  │  Every step WORM-sealed. Failures isolated per step.        │
  │  stopOnFail halts on critical failure.                      │
  │  Conditional steps via "if" field.                           │
  └─────────────────────────────────────────────────────────────┘
```

## API Server

Fastify REST API — any agent can call in, shell executes, WORM seals.

```
  POST /run          Execute a command by key
  POST /shell        Execute raw shell command
  POST /backtick     Resolve backticks in agent text
  POST /workflow     Run a named workflow
  GET  /commands     List all 100+ commands
  GET  /commands/search?q=   Search registry
  GET  /commands/:tag        Commands by tag
  GET  /worm          Recent WORM entries
  GET  /health        Status check
```

## CLI Usage

```bash
# Run a command
sk run git.status
sk run grep.pattern pattern=TODO path=./src
sk run sys.gpu

# Search registry
sk search grep
sk tag rust

# WORM chain
sk worm 20
sk verify

# Run a workflow
skrun workflows/audit-repo.json
skrun workflows/audit-repo.json --cwd ./other-repo
```

## Architecture

| File | Role |
|------|------|
| `bin/sk.mjs` | CLI entrypoint — run, search, tag, worm, verify |
| `bin/skrun.mjs` | Workflow runner CLI |
| `src/commands/registry.mjs` | 100+ commands across 14 tags |
| `src/executor/backtick.mjs` | Parse backticks, execute, WORM-seal |
| `src/governance/gate.mjs` | Trust Deed gate — blocks destructive ops |
| `src/worm/chain.mjs` | Append-only SHA-256 chain + PQ signatures |
| `src/crypto/cbom.mjs` | Cryptography Bill of Materials |
| `src/crypto/pq.mjs` | ML-DSA-65 post-quantum signing |
| `src/workflow/runner.mjs` | JSON workflow executor |
| `src/api/server.mjs` | Fastify REST API (port 4600) |

## Post-Quantum Security

```
  ┌──────────────────────────────────────────────────────────┐
  │  WORM SEAL LAYERS                                        │
  │                                                          │
  │  Layer 1: SHA-256 chain link                             │
  │           PQ-safe: Grover → 128-bit effective            │
  │                                                          │
  │  Layer 2: ML-DSA-65 signature (FIPS 204)                │
  │           Post-quantum: lattice-based                    │
  │           Classical: ~178 bits                           │
  │           PQ: ~128 bits (NIST Level 3)                   │
  │                                                          │
  │  Layer 3: CBOM record                                    │
  │           Which primitives sealed this entry             │
  │           NIST PQC compliance tracking                   │
  │                                                          │
  │  Quantum threats addressed:                              │
  │  ✓ SHA-256: safe (Grover doesn't break hash)            │
  │  ✓ ML-DSA-65: safe (lattice problems)                   │
  │  ✗ Ed448/RSA/ECDSA: deprecated (Shor's breaks)          │
  └──────────────────────────────────────────────────────────┘
```

## Install

```bash
git clone https://github.com/SNAPKITTYWEST/snapkitty-shell.git
cd snapkitty-shell
npm install
node bin/sk --help

# Optional: post-quantum signing
npm install @noble/post-quantum
```

## License

Apache 2.0
