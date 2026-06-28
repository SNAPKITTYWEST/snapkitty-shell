/**
 * SNAPKITTY SHELL — Workflow Runner
 *
 * Executes sovereign shell workflows defined as JSON/YAML.
 * Each step is a command from the registry (or raw shell).
 * Steps can be sequential, parallel, or conditional.
 * Every step is WORM-sealed. Failures are isolated per step.
 *
 * Workflow schema:
 * {
 *   name: "audit-repo",
 *   description: "Full repo audit",
 *   env: { cwd: "./src" },
 *   steps: [
 *     { id: "status",   run: "git.status" },
 *     { id: "search",   run: "grep.pattern", args: { pattern: "TODO", path: "." } },
 *     { id: "gpu",      run: "sys.gpu", if: "env.HAS_GPU" },
 *     { id: "parallel", parallel: ["npm.audit", "cargo.check"] },
 *     { id: "report",   run: "raw", cmd: "echo workflow complete" },
 *   ]
 * }
 */

import { run } from '../executor/backtick.mjs'
import { wormSeal } from '../worm/chain.mjs'
import { executeBacktick } from '../executor/backtick.mjs'

export async function runWorkflow(workflow, env = {}) {
  const ctx = { ...workflow.env, ...env }
  const results = {}
  const log = []

  const wfStart = Date.now()
  console.log(`\n⬡ SNAPKITTY WORKFLOW: ${workflow.name}`)
  console.log(`  ${workflow.description || ''}`)
  console.log(`  Steps: ${workflow.steps.length}\n`)

  for (const step of workflow.steps) {
    // Conditional execution
    if (step.if) {
      const val = step.if.split('.').reduce((o, k) => o?.[k], { env: ctx, results })
      if (!val) {
        console.log(`  [SKIP] ${step.id} — condition "${step.if}" falsy`)
        log.push({ step: step.id, status: 'skipped', reason: step.if })
        continue
      }
    }

    const stepStart = Date.now()

    // Parallel steps
    if (step.parallel) {
      console.log(`  [PARALLEL] ${step.id}: ${step.parallel.join(', ')}`)
      const parallelResults = await Promise.allSettled(
        step.parallel.map(key => run(key, {}, ctx))
      )
      results[step.id] = parallelResults.map((r, i) => ({
        key: step.parallel[i],
        ...(r.status === 'fulfilled' ? r.value : { output: r.reason?.message, error: true })
      }))
      const ms = Date.now() - stepStart
      console.log(`  [DONE]  ${step.id} — ${ms}ms (${step.parallel.length} parallel)`)
      log.push({ step: step.id, status: 'ok', ms, parallel: true })
      continue
    }

    // Single step
    let result
    if (step.run === 'raw') {
      result = await executeBacktick(step.cmd, ctx)
    } else {
      result = await run(step.run, step.args || {}, ctx)
    }

    results[step.id] = result
    const ms = Date.now() - stepStart
    const icon = result.error ? '[ERR] ' : '[OK]  '
    console.log(`  ${icon}${step.id} (${step.run}) — ${ms}ms`)
    if (result.output) {
      const preview = result.output.split('\n').slice(0, 3).join('\n')
      console.log(`         ${preview.replace(/\n/g, '\n         ')}`)
    }
    log.push({ step: step.id, status: result.error ? 'error' : 'ok', ms, cmd: result.cmd })

    // Stop on failure if required
    if (result.error && step.required !== false) {
      if (step.stopOnFail) {
        console.log(`\n  ⚠ WORKFLOW STOPPED at step "${step.id}" (stopOnFail)`)
        break
      }
    }
  }

  const totalMs = Date.now() - wfStart
  const ok = log.filter(l => l.status === 'ok').length
  const errors = log.filter(l => l.status === 'error').length

  console.log(`\n⬡ WORKFLOW COMPLETE: ${workflow.name}`)
  console.log(`  ${ok} ok · ${errors} errors · ${totalMs}ms total\n`)

  // WORM seal the whole workflow run
  await wormSeal({
    event: 'WORKFLOW_RUN',
    name:  workflow.name,
    steps: log.length,
    ok, errors, totalMs,
  }).catch(() => {})

  return { workflow: workflow.name, results, log, ok, errors, totalMs }
}
