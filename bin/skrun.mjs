#!/usr/bin/env node
/**
 * skrun — run a snapkitty-shell workflow from the command line
 * Usage: skrun workflows/audit-repo.json [--cwd ./path]
 */
import { readFileSync } from 'fs'
import { runWorkflow } from '../src/workflow/runner.mjs'

const [,, wfFile, ...flags] = process.argv
if (!wfFile) {
  console.error('Usage: skrun <workflow.json> [--cwd <path>]')
  process.exit(1)
}

const cwdFlag = flags.indexOf('--cwd')
const env = cwdFlag >= 0 ? { cwd: flags[cwdFlag + 1] } : {}

const workflow = JSON.parse(readFileSync(wfFile, 'utf8'))
const result = await runWorkflow(workflow, env)

process.exit(result.errors > 0 ? 1 : 0)
