/**
 * SNAPKITTY SHELL — Trust Deed Governance Gate
 * Blocks destructive commands. Every shell execution passes through here.
 */

// ── Blocked patterns — never execute regardless of source ────────────────────
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/,          // rm -rf / (root delete)
  /format\s+c:/i,                 // Windows format
  /del\s+\/[sf].*\\\*/i,          // Windows recursive delete
  /drop\s+database/i,             // DB nuke
  /truncate\s+worm_chain/i,       // WORM chain truncation
  /:(){:|:&};:/,                  // fork bomb
  />\s*\/dev\/sda/,               // disk wipe
  /dd\s+if=\/dev\/zero\s+of=\/dev\/sd/,
]

// ── Confirm-required commands — agent must pass confirm:true ─────────────────
const CONFIRM_REQUIRED = [
  'git.push', 'gh.repo.create', 'gh.release',
  'sys.kill', 'sys.ps.kill', 'docker.down',
  'psql.cmd',  // raw SQL mutations
]

export function trustGate(key, def, options = {}) {
  const cmd = def?.cmd || key

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cmd)) {
      return { allowed: false, reason: `BLOCKED_PATTERN: matches ${pattern}` }
    }
  }

  // Check confirm-required
  if (CONFIRM_REQUIRED.includes(key) && !options.confirmed) {
    if (def?.confirm && !options.confirmed) {
      return {
        allowed: false,
        reason: `CONFIRM_REQUIRED: '${key}' requires confirm:true in options`,
        requiresConfirm: true,
      }
    }
  }

  // Mark destructive commands
  if (def && def.safe === false) {
    return {
      allowed: true,
      warning: `DESTRUCTIVE: '${key}' is marked unsafe — proceeding with caution`,
    }
  }

  return { allowed: true }
}
