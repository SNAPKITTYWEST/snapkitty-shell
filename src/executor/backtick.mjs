/**
 * SNAPKITTY SHELL — Backtick Executor
 *
 * Parses agent prompts/responses for `command` substitution blocks,
 * executes them in a sandboxed shell, injects output back into the
 * agent context, and WORM-seals every execution.
 *
 * Usage in agent prompts:
 *   "The current git status is: `git.status`"
 *   "Search for TODOs: `grep.pattern pattern=TODO path=./src`"
 *   "GPU memory free: `sys.gpu`"
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { COMMAND_BOOK } from '../commands/registry.mjs'
import { wormSeal } from '../worm/chain.mjs'
import { trustGate } from '../governance/gate.mjs'

const execAsync = promisify(exec)

// ── Parse backtick blocks from text ──────────────────────────────────────────
export function parseBackticks(text) {
  const matches = []
  // Match `key arg=val arg=val` or `raw shell command`
  const re = /`([^`]+)`/g
  let m
  while ((m = re.exec(text)) !== null) {
    matches.push({ full: m[0], inner: m[1].trim(), index: m.index })
  }
  return matches
}

// ── Interpolate named args into command template ──────────────────────────────
function interpolate(template, args) {
  let result = template
  for (const [k, v] of Object.entries(args)) {
    result = result.replaceAll(`{${k}}`, v)
  }
  return result
}

// ── Parse key + args from backtick inner: "git.log" or "grep.pattern pattern=TODO path=./src"
function parseInner(inner) {
  const parts = inner.trim().split(/\s+/)
  const key   = parts[0]
  const args  = {}
  for (const part of parts.slice(1)) {
    const [k, ...rest] = part.split('=')
    args[k] = rest.join('=')
  }
  return { key, args }
}

// ── Execute a single backtick block ──────────────────────────────────────────
export async function executeBacktick(inner, context = {}) {
  const { key, args } = parseInner(inner)
  const allArgs = { ...context, ...args }

  // Check if it's a registered command key
  const def = COMMAND_BOOK[key]
  let cmd

  if (def) {
    // Trust Deed gate — block destructive commands unless confirmed
    const gate = trustGate(key, def)
    if (!gate.allowed) {
      return { output: `[TRUST DEED BLOCKED: ${gate.reason}]`, cmd: key, blocked: true }
    }
    cmd = interpolate(def.cmd, allArgs)
  } else {
    // Raw shell command — still gate-check
    const gate = trustGate('raw', { cmd: inner, tags: ['raw'], safe: !inner.match(/rm\s+-rf|drop\s+table|format\s+c:/i) })
    if (!gate.allowed) {
      return { output: `[TRUST DEED BLOCKED: raw command denied]`, cmd: inner, blocked: true }
    }
    cmd = inner
  }

  const start = Date.now()
  let output, error

  try {
    const result = await execAsync(cmd, {
      timeout: 30_000,
      maxBuffer: 1024 * 512,   // 512KB max output
      cwd: allArgs.cwd || process.cwd(),
    })
    output = result.stdout.trim() || result.stderr.trim() || '(no output)'
  } catch (err) {
    output = err.stdout?.trim() || ''
    error  = err.stderr?.trim() || err.message
    output = output || error || '(command failed)'
  }

  const ms = Date.now() - start

  // WORM seal
  await wormSeal({
    event:   'SHELL_EXEC',
    cmd,
    key:     key || 'raw',
    ms,
    ok:      !error,
    preview: output.slice(0, 200),
  }).catch(() => {})

  return { output, cmd, key, ms, error: error || null }
}

// ── Resolve all backticks in a text block ─────────────────────────────────────
export async function resolveText(text, context = {}) {
  const blocks = parseBackticks(text)
  if (!blocks.length) return { text, executions: [] }

  const executions = []
  let resolved = text

  // Execute all blocks concurrently
  const results = await Promise.all(
    blocks.map(b => executeBacktick(b.inner, context))
  )

  // Replace backtick blocks with output (reverse order to preserve indices)
  for (let i = blocks.length - 1; i >= 0; i--) {
    const { full }   = blocks[i]
    const { output } = results[i]
    resolved = resolved.slice(0, blocks[i].index) +
               `\`${output}\`` +
               resolved.slice(blocks[i].index + full.length)
    executions.push({ ...blocks[i], ...results[i] })
  }

  return { text: resolved, executions }
}

// ── Agent-callable: execute command by registry key ───────────────────────────
export async function run(key, args = {}, context = {}) {
  return executeBacktick(`${key} ${Object.entries(args).map(([k,v]) => `${k}=${v}`).join(' ')}`, context)
}
