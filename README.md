# SnapKitty Shell

**Sovereign agentic shell execution framework.**

The agent writes backticks. The shell executes them. The ledger seals them.

---

## The Backtick Substitution

This is the core mechanism. An agent writes a prompt with backtick blocks. The executor resolves them to real shell commands, runs them, and replaces the backticks with output.

```
  AGENT PROMPT:
  ┌────────────────────────────────────────────────────────────────┐
  │ "The current git status is: `git.status`"                     │
  │ "Search for TODOs: `grep.pattern pattern=TODO path=./src`"    │
  │ "GPU memory free: `sys.gpu`"                                   │
  └────────────────────────────────────────────────────────────────┘
                              │
                              v
  ┌────────────────────────────────────────────────────────────────┐
  │  BACKTICK EXECUTOR                                             │
  │                                                                │
  │  1. PARSE — extract backtick blocks from text                  │
  │     `git.status`                                               │
  │     `grep.pattern pattern=TODO path=./src`                     │
  │     `sys.gpu`                                                  │
  │                                                                │
  │  2. RESOLVE — look up command key in registry                  │
  │     git.status          →  git status --short                  │
  │     grep.pattern        →  grep -rn "TODO" ./src              │
  │     sys.gpu             →  nvidia-smi --query-gpu=...          │
  │                                                                │
  │  3. GATE — pass through governance (NACK tick if blocked)     │
  │                                                                │
  │  4. EXECUTE — spawn subprocess (30s timeout, 512KB buffer)    │
  │                                                                │
  │  5. REPLACE — swap backtick blocks with captured output        │
  │                                                                │
  │  6. SEAL — append execution to WORM chain                     │
  └────────────────────────────────────────────────────────────────┘
                              │
                              v
  RESOLVED PROMPT:
  ┌────────────────────────────────────────────────────────────────┐
  │ "The current git status is: `M src/main.rs`"                  │
  │ "Search for TODOs: `src/main.rs:42: TODO implement auth`"     │
  │ "GPU memory free: `NVIDIA RTX 4090, 16GB free`"               │
  └────────────────────────────────────────────────────────────────┘
```

### Backtick Syntax

```
`command.key`                        — simple execution
`command.key arg=val`                — with arguments
`grep.pattern pattern=TODO path=.`   — multiple args
`cargo.build --release`              — raw shell (if not in registry)
```

The agent never writes raw shell commands. It writes semantic keys. The executor maps them to real commands. This means:

1. **The agent can't bypass the gate** — every key goes through governance
2. **Commands are composable** — same key works in CLI, API, and workflows
3. **Arguments are interpolated** — `{key}` placeholders in command templates
4. **Every execution is sealed** — WORM chain records the attempt

## Command Registry

100+ commands across 14 tags. Every command is tagged, safety-rated, and composable.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  TAG        EXAMPLES                          SAFE?             │
  │  ─────────  ────────────────────────────────  ────────────────  │
  │  git        git.status, git.log, git.push     push = confirm   │
  │  gh         gh.repo.create, gh.pr.create      create = confirm │
  │  search     grep.pattern, rg.fast, find.name  all safe         │
  │  rust       cargo.build, cargo.test, cargo.fmt  all safe       │
  │  node       npm.install, npm.test, node.run   all safe         │
  │  python     py.test, py.uvicorn, py.vllm.serve  all safe       │
  │  docker     docker.up, docker.down, docker.logs  down=confirm  │
  │  db         psql.run, psql.cmd, psql.dump     cmd = confirm    │
  │  http       curl.get, curl.post.json, curl.health  all safe    │
  │  net        tailscale.status, arp.scan        all safe         │
  │  aws        aws.whoami, aws.models, aws.s3.ls  all safe        │
  │  sys        sys.gpu, sys.procs, sys.kill      kill = confirm   │
  │  asm        nasm.build, nasm.com              all safe         │
  │  lean       lean.check, lake.build, lake.test all safe         │
  │  file       cat, head, tail, wc, jq, diff     all safe         │
  └──────────────────────────────────────────────────────────────────┘
```

## NACK Tick — When the Gate Rejects

Every backtick goes through the governance gate. If blocked, the executor returns a **NACK tick** — a negative acknowledgment that is still WORM-sealed.

```
  Agent sends: `rm -rf /tmp/important`
                        │
                        v
  GOVERNANCE GATE:
    Pattern: /rm\s+-rf\s+\/(?!\w)/ → MATCH → BLOCKED
                        │
                        v
  NACK TICK RETURNED:
    { output: "[TRUST DEED BLOCKED: ...]",
      cmd: "rm -rf /tmp/important",
      blocked: true }         ◄── THE NACK
                        │
                        v
  WORM SEALED ANYWAY:
    The rejection is recorded. The chain extends.
    Even blocked commands leave an immutable audit trail.
```

### NACK Types

| Type | Trigger | What happens |
|------|---------|--------------|
| `BLOCKED_PATTERN` | Kill switch matched (rm -rf /, format c:, drop database, fork bomb) | Command never runs. NACK sealed. |
| `CONFIRM_REQUIRED` | Dangerous op needs explicit confirmation (git.push, sys.kill) | Agent must pass `confirm: true` |
| `DESTRUCTIVE_WARNING` | Command marked `safe: false` | Allowed with warning. Still sealed. |
| `RAW_DENIED` | Raw shell matches blocked pattern | NACK returned. Raw shell rejected. |

### Why NACK Ticks Are Immutable

```
  WITHOUT NACK TICK:     Agent → rm -rf / → EXECUTED → DAMAGE
  WITH NACK TICK:        Agent → rm -rf / → NACK → SEALED → Agent retries
                                                      │
                                                      └─► Audit proves attempt
```

The NACK is not just a guard. It is a **post-quantum signed receipt** that the agent attempted something destructive. ML-DSA-65 (FIPS 204) seals the rejection. SHA-256 chains it to the ledger. Tampering breaks the chain.

## WORM Chain

Every backtick execution — successful or NACK'd — is appended to the ledger.

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  WORM CHAIN (append-only, SHA-256 chained, PQ-signed)          │
  │                                                                  │
  │  #0 [22:30:01] git.status        ok     sha256:a8d9...         │
  │  #1 [22:30:02] grep.pattern      ok     sha256:7f3a...         │
  │  #2 [22:30:03] rm -rf /          NACK   sha256:b2c1...         │
  │  #3 [22:30:04] sys.gpu           ok     sha256:e5d4...         │
  │                                                                  │
  │  Each entry:                                                     │
  │  - SHA-256 of prev + payload → chain link                       │
  │  - ML-DSA-65 signature → post-quantum seal                      │
  │  - CBOM record → which primitives sealed it                      │
  │                                                                  │
  │  Tamper with #2 → #3's hash breaks → chain invalid              │
  │  Quantum computer → SHA-256 safe (Grover → 128-bit)            │
  │                     ML-DSA-65 safe (lattice-based)              │
  └──────────────────────────────────────────────────────────────────┘
```

## Workflow Runner

JSON workflows compose backtick commands into multi-step agent tasks.

```
  ┌──────────────────────────────────────────────────────────────┐
  │  WORKFLOW: audit-repo                                        │
  │                                                              │
  │  Step 1: git.status                                          │
  │  Step 2: git.log                                             │
  │  Step 3: grep.pattern (TODO|FIXME|HACK)                     │
  │  Step 4: ── PARALLEL ──┬── npm.audit                        │
  │                        └── npm.test                         │
  │  Step 5: sys.gpu  (if: env.HAS_GPU)                         │
  │  Step 6: gh.repo.list                                        │
  │                                                              │
  │  Every step WORM-sealed. Failures isolated per step.         │
  │  stopOnFail halts on critical failure.                        │
  └──────────────────────────────────────────────────────────────┘
```

## API Server

Fastify REST API — any agent calls in, shell executes, WORM seals.

```
  POST /run          Execute a command by registry key
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
# Run a command by key
sk run git.status
sk run grep.pattern pattern=TODO path=./src
sk run sys.gpu

# Search the registry
sk search grep
sk tag rust

# Inspect the WORM chain
sk worm 20
sk verify

# Run a workflow
skrun workflows/audit-repo.json
skrun workflows/audit-repo.json --cwd ./other-repo
```

## Architecture

| File | Role |
|------|------|
| `bin/sk.mjs` | CLI — run, search, tag, worm, verify |
| `bin/skrun.mjs` | Workflow runner CLI |
| `src/commands/registry.mjs` | 100+ commands, 14 tags, safety-rated |
| `src/executor/backtick.mjs` | **Backtick substitution** — the core mechanism |
| `src/governance/gate.mjs` | Trust Deed gate — NACK tick on destructive ops |
| `src/worm/chain.mjs` | Append-only SHA-256 chain + PQ signatures |
| `src/crypto/cbom.mjs` | Cryptography Bill of Materials |
| `src/crypto/pq.mjs` | ML-DSA-65 post-quantum signing |
| `src/workflow/runner.mjs` | JSON workflow executor |
| `src/api/server.mjs` | Fastify REST API (port 4600) |

## Post-Quantum Security

```
  WORM SEAL LAYERS:

  Layer 1: SHA-256 chain link
           PQ-safe: Grover → 128-bit effective

  Layer 2: ML-DSA-65 signature (FIPS 204)
           Post-quantum: lattice-based
           Classical: ~178 bits
           PQ: ~128 bits (NIST Level 3)

  Layer 3: CBOM record
           Which primitives sealed this entry
           NIST PQC compliance tracking
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
