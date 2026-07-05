# SnapKitty Shell

**Sovereign agentic shell execution framework.**

Backtick executor, grep agent, workflow DSL, WORM-sealed command ledger.

---

## How It Works

```
                          ┌─────────────────────────┐
                          │    USER INPUT            │
                          │  "run deploy --env prod" │
                          └────────────┬────────────┘
                                       │
                                       v
               ┌───────────────────────────────────────┐
               │         WORKFLOW DSL PARSER           │
               │  Parses shell commands into a DAG    │
               │  of operators and dependencies        │
               └───────────────────┬──────────────────┘
                                   │
                                   v
                    ┌──────────────────────────┐
                    │     BACKTICK EXECUTOR     │
                    │  Spawns subprocesses.     │
                    │  Captures stdout/stderr.  │
                    │  Enforces sandbox limits. │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
                    v                          v
          ┌──────────────────┐     ┌──────────────────────┐
          │   GREP AGENT     │     │   SIGNAL AGENT       │
          │  Watches output   │     │  Listens for signals  │
          │  for patterns.    │     │  (SIGTERM, SIGUSR1)   │
          │  Triggers routes. │     │  Triggers shutdown.   │
          └────────┬─────────┘     └──────────┬───────────┘
                   │                           │
                   v                           v
          ┌──────────────────┐     ┌──────────────────────┐
          │  ROUTE TABLE     │     │  CLEANUP HANDLER     │
          │  pattern->action │     │  Kill children.       │
          │  mappings.       │     │  Flush buffers.       │
          └────────┬─────────┘     └──────────┬───────────┘
                   │                           │
                   └───────────┬───────────────┘
                               v
                   ┌──────────────────────┐
                   │  WORM COMMAND LEDGER  │
                   │  Append-only.         │
                   │  Immutable receipts.  │
                   │  Ed25519 sealed.      │
                   └──────────────────────┘
```

## Commands

```
snapkitty run <workflow>     Execute a workflow DSL file
snapkitty exec <command>     Execute a single shell command (backtick mode)
snapkitty tail <ledger>      Stream live output from a running workflow
snapkitty audit <ledger>     Verify WORM chain integrity
snapkitty replay <receipt>   Re-execute a command from a sealed receipt
```

## Workflow DSL Example

```yaml
# workflows/deploy.yaml
name: deploy
nodes:
  - id: build
    run: cargo build --release
  - id: test
    run: cargo test
    depends_on: build
  - id: deploy
    run: rsync -avz target/release/ prod:/opt/app/
    depends_on: test
    env:
      SSH_KEY: /etc/ssh/deploy_key

on_failure:
  - notify: slack:#deploys
  - rollback: last_known_good
```

## Signal Flow

```
  User types "snapkitty run deploy"
          │
          v
  Parser builds DAG: build -> test -> deploy
          │
          v
  Executor walks DAG, spawning nodes
          │
          v
  Each node:
    ┌─────────────────────────────────────────┐
    │  1. Clone sandbox (or use shared)       │
    │  2. Set env vars from node spec         │
    │  3. exec() the shell command            │
    │  4. Capture stdout/stderr to buffer     │
    │  5. Grep agent scans buffer for matches │
    │  6. If pattern hit -> trigger route     │
    │  7. On exit -> write receipt to ledger  │
    └─────────────────────────────────────────┘
          │
          v
  WORM Ledger:
    ┌─────────────────────────────────────────┐
    │  [seq=0] deploy/build  exit=0  1.2s    │
    │  [seq=1] deploy/test   exit=0  3.4s    │
    │  [seq=2] deploy/deploy exit=0  0.8s    │
    │  chain_hash: 7f3a...                   │
    │  sealed: Ed25519(SNAPKITTY)             │
    └─────────────────────────────────────────┘
```

## Architecture

| Component | Role | Path |
|-----------|------|------|
| `src/parser.mjs` | Workflow DSL parser | DAG builder |
| `src/executor.mjs` | Backtick subprocess spawner | Sandbox enforcement |
| `src/grep_agent.mjs` | Output pattern watcher | Route trigger |
| `src/signal_agent.mjs` | OS signal listener | Graceful shutdown |
| `src/ledger.mjs` | WORM command ledger | Append-only receipts |
| `src/cli.mjs` | CLI entrypoint | Command dispatch |

## Install

```bash
git clone https://github.com/SNAPKITTYWEST/snapkitty-shell.git
cd snapkitty-shell
npm install
node bin/snapkitty --help
```

## WORM Ledger Format

Each receipt in the ledger is an append-only JSON record:

```json
{
  "seq": 2,
  "cmd": "deploy/deploy",
  "args": ["rsync", "-avz", "target/release/", "prod:/opt/app/"],
  "exit_code": 0,
  "duration_ms": 847,
  "stdout_bytes": 1024,
  "stderr_bytes": 0,
  "timestamp": "2026-07-04T22:30:00Z",
  "chain_hash": "7f3a1b...",
  "prev_hash": "a8d9c0...",
  "signature": "ed25519:SNAPKITTY:..."
}
```

The ledger is **append-only**. Each receipt includes the hash of the previous receipt, forming a chain. Tampering with any receipt breaks the chain.

## License

Apache 2.0
