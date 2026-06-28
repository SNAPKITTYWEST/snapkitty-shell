#!/usr/bin/env node
/**
 * sk — snapkitty-shell CLI
 * Usage:
 *   sk run git.status
 *   sk run grep.pattern pattern=TODO path=./src
 *   sk search grep
 *   sk tags
 *   sk worm
 */
import { run } from '../src/executor/backtick.mjs'
import { search, byTag, COMMAND_BOOK, TOTAL } from '../src/commands/registry.mjs'
import { readWorm, verifyChain } from '../src/worm/chain.mjs'

const [,, cmd, ...args] = process.argv

if (!cmd || cmd === 'help') {
  console.log(`\n⬡ SNAPKITTY SHELL — ${TOTAL} commands registered`)
  console.log('\nUsage:')
  console.log('  sk run <key> [arg=val ...]   — execute a command')
  console.log('  sk search <query>             — search command registry')
  console.log('  sk tag <tag>                  — list commands by tag')
  console.log('  sk worm [limit]               — show WORM chain')
  console.log('  sk verify                     — verify WORM chain integrity')
  console.log('\nTags: git, gh, search, rust, node, python, docker, db, http, sys, asm, lean, file')
  console.log('\nExamples:')
  console.log('  sk run git.status')
  console.log('  sk run grep.pattern pattern=TODO path=.')
  console.log('  sk run sys.gpu')
  console.log('  sk run cargo.build')
  process.exit(0)
}

if (cmd === 'run') {
  const key  = args[0]
  const kv   = Object.fromEntries(args.slice(1).map(a => a.split('=')))
  if (!key) { console.error('sk run <key>'); process.exit(1) }
  const result = await run(key, kv)
  console.log(result.output)
  if (result.error) process.exit(1)

} else if (cmd === 'search') {
  const q = args.join(' ')
  const results = search(q)
  console.log(`\n${results.length} results for "${q}":\n`)
  results.forEach(r => console.log(`  ${r.key.padEnd(20)} ${r.cmd}`))

} else if (cmd === 'tag') {
  const tag = args[0]
  const cmds = byTag(tag)
  console.log(`\n${cmds.length} commands tagged [${tag}]:\n`)
  cmds.forEach(c => console.log(`  ${c.key.padEnd(20)} ${c.cmd}`))

} else if (cmd === 'worm') {
  const limit = parseInt(args[0] || '20')
  const { chain, total } = readWorm(limit)
  console.log(`\nWORM chain — ${total} total entries (showing last ${limit}):\n`)
  chain.forEach(e => {
    console.log(`  #${e.seq} [${e.ts.slice(11,19)}] ${e.payload.event || e.payload.cmd || ''}  ${e.this_hash}`)
  })

} else if (cmd === 'verify') {
  const result = verifyChain()
  console.log(result.valid ? `\n✓ WORM chain VALID — ${result.entries} entries` : `\n✗ CHAIN BROKEN at seq ${result.broken}`)

} else {
  console.error(`Unknown command: ${cmd}. Run 'sk help'`)
  process.exit(1)
}
