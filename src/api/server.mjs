/**
 * SNAPKITTY SHELL — Agent API Server
 * Fastify REST API — any agent calls in, shell executes, WORM seals
 *
 * POST /run           — execute a command by key
 * POST /workflow      — run a named workflow
 * POST /backtick      — resolve backticks in agent text
 * GET  /commands      — list all commands
 * GET  /commands/search?q= — search registry
 * GET  /commands/:tag — commands by tag
 * GET  /worm          — recent WORM entries
 * GET  /health
 */

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { run } from '../executor/backtick.mjs'
import { resolveText } from '../executor/backtick.mjs'
import { runWorkflow } from '../workflow/runner.mjs'
import { COMMAND_BOOK, search, byTag, TOTAL } from '../commands/registry.mjs'
import { readWorm } from '../worm/chain.mjs'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const app   = Fastify({ logger: false })
await app.register(cors, { origin: '*' })

// ── POST /run ─────────────────────────────────────────────────────────────────
app.post('/run', async (req, reply) => {
  const { key, args = {}, context = {} } = req.body || {}
  if (!key) return reply.code(400).send({ error: 'key required' })
  const result = await run(key, args, context)
  return result
})

// ── POST /shell — raw shell command ──────────────────────────────────────────
app.post('/shell', async (req, reply) => {
  const { cmd, context = {} } = req.body || {}
  if (!cmd) return reply.code(400).send({ error: 'cmd required' })
  const { executeBacktick } = await import('../executor/backtick.mjs')
  const result = await executeBacktick(cmd, context)
  return result
})

// ── POST /backtick — resolve backticks in agent text ─────────────────────────
app.post('/backtick', async (req, reply) => {
  const { text, context = {} } = req.body || {}
  if (!text) return reply.code(400).send({ error: 'text required' })
  return resolveText(text, context)
})

// ── POST /workflow ────────────────────────────────────────────────────────────
app.post('/workflow', async (req, reply) => {
  const { name, workflow, env = {} } = req.body || {}

  let wf = workflow
  if (!wf && name) {
    try {
      const p = join(__dir, '../../workflows', `${name}.json`)
      wf = JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      return reply.code(404).send({ error: `Workflow '${name}' not found` })
    }
  }
  if (!wf) return reply.code(400).send({ error: 'workflow or name required' })

  const result = await runWorkflow(wf, env)
  return result
})

// ── GET /commands ─────────────────────────────────────────────────────────────
app.get('/commands', async () => {
  return { total: TOTAL, commands: COMMAND_BOOK }
})

// ── GET /commands/search ──────────────────────────────────────────────────────
app.get('/commands/search', async (req) => {
  const { q = '' } = req.query
  return { query: q, results: search(q) }
})

// ── GET /commands/:tag ────────────────────────────────────────────────────────
app.get('/commands/:tag', async (req) => {
  return { tag: req.params.tag, commands: byTag(req.params.tag) }
})

// ── GET /worm ─────────────────────────────────────────────────────────────────
app.get('/worm', async (req) => {
  const { limit = 50 } = req.query
  return readWorm(Number(limit))
})

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', async () => ({
  status: 'SNAPKITTY_SHELL_ONLINE',
  commands: TOTAL,
  worm: 'sealed',
  trustDeed: 'active',
  seal: '⬡ Ω ↺ Ψ Δ Λ Σ Φ α',
}))

const PORT = process.env.PORT || 4600
await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`\n⬡ SNAPKITTY SHELL — port ${PORT}`)
console.log(`  ${TOTAL} commands registered`)
console.log(`  POST /run · POST /shell · POST /backtick · POST /workflow`)
console.log(`  GET  /commands · /commands/search · /worm · /health\n`)
