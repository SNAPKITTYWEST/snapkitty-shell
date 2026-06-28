/**
 * SNAPKITTY SHELL — Sovereign Command Registry
 * Every command Ahmad uses + every command Claude uses — combined, catalogued, executable.
 * ⬡ Ω ↺ Ψ Δ Λ Σ Φ α
 */

// ── COMMAND BOOK ─────────────────────────────────────────────────────────────
// Every command in this registry is:
//   - tagged by domain
//   - marked safe/destructive
//   - composable in workflows
//   - WORM-logged on execution

export const COMMAND_BOOK = {

  // ── GIT ────────────────────────────────────────────────────────────────────
  'git.status':       { cmd: 'git status --short',                   tags: ['git'],        safe: true },
  'git.log':          { cmd: 'git log --oneline -20',                 tags: ['git'],        safe: true },
  'git.diff':         { cmd: 'git diff',                              tags: ['git'],        safe: true },
  'git.diff.staged':  { cmd: 'git diff --cached',                     tags: ['git'],        safe: true },
  'git.branch':       { cmd: 'git branch -a',                         tags: ['git'],        safe: true },
  'git.push':         { cmd: 'git push',                              tags: ['git'],        safe: false, confirm: true },
  'git.pull':         { cmd: 'git pull',                              tags: ['git'],        safe: true },
  'git.stash':        { cmd: 'git stash',                             tags: ['git'],        safe: true },
  'git.init':         { cmd: 'git init',                              tags: ['git'],        safe: true },
  'git.add.all':      { cmd: 'git add -A',                            tags: ['git'],        safe: true },

  // ── GITHUB CLI ─────────────────────────────────────────────────────────────
  'gh.repo.create':   { cmd: 'gh repo create {name} --public',        tags: ['gh','create'], safe: false },
  'gh.repo.list':     { cmd: 'gh repo list SNAPKITTYWEST --limit 50',  tags: ['gh'],        safe: true },
  'gh.pr.create':     { cmd: 'gh pr create --title "{title}"',         tags: ['gh'],        safe: false },
  'gh.issue.list':    { cmd: 'gh issue list',                          tags: ['gh'],        safe: true },
  'gh.release':       { cmd: 'gh release create {tag}',               tags: ['gh'],        safe: false },

  // ── GREP / SEARCH ──────────────────────────────────────────────────────────
  'grep.pattern':     { cmd: 'grep -rn "{pattern}" {path}',           tags: ['search'],    safe: true },
  'grep.files':       { cmd: 'grep -rl "{pattern}" {path}',           tags: ['search'],    safe: true },
  'grep.i':           { cmd: 'grep -rni "{pattern}" {path}',          tags: ['search'],    safe: true },
  'grep.ext':         { cmd: 'grep -rn "{pattern}" --include="*.{ext}" {path}', tags: ['search'], safe: true },
  'grep.context':     { cmd: 'grep -rn -C 3 "{pattern}" {path}',      tags: ['search'],    safe: true },
  'grep.count':       { cmd: 'grep -rc "{pattern}" {path}',           tags: ['search'],    safe: true },
  'rg.fast':          { cmd: 'rg "{pattern}" {path}',                 tags: ['search'],    safe: true },
  'rg.type':          { cmd: 'rg "{pattern}" -t {type} {path}',       tags: ['search'],    safe: true },
  'rg.files':         { cmd: 'rg -l "{pattern}" {path}',              tags: ['search'],    safe: true },
  'find.name':        { cmd: 'find {path} -name "{glob}"',            tags: ['search'],    safe: true },
  'find.ext':         { cmd: 'find {path} -name "*.{ext}"',           tags: ['search'],    safe: true },
  'find.recent':      { cmd: 'find {path} -newer {ref} -type f',      tags: ['search'],    safe: true },

  // ── RUST / CARGO ───────────────────────────────────────────────────────────
  'cargo.build':      { cmd: 'cargo build',                           tags: ['rust'],      safe: true },
  'cargo.build.rel':  { cmd: 'cargo build --release',                 tags: ['rust'],      safe: true },
  'cargo.run':        { cmd: 'cargo run',                             tags: ['rust'],      safe: true },
  'cargo.run.bin':    { cmd: 'cargo run --bin {bin}',                 tags: ['rust'],      safe: true },
  'cargo.test':       { cmd: 'cargo test',                            tags: ['rust'],      safe: true },
  'cargo.check':      { cmd: 'cargo check',                           tags: ['rust'],      safe: true },
  'cargo.clippy':     { cmd: 'cargo clippy -- -D warnings',           tags: ['rust'],      safe: true },
  'cargo.fmt':        { cmd: 'cargo fmt',                             tags: ['rust'],      safe: true },
  'cargo.add':        { cmd: 'cargo add {crate}',                     tags: ['rust'],      safe: true },

  // ── NODE / NPM ─────────────────────────────────────────────────────────────
  'npm.install':      { cmd: 'npm install',                           tags: ['node'],      safe: true },
  'npm.run':          { cmd: 'npm run {script}',                      tags: ['node'],      safe: true },
  'npm.test':         { cmd: 'npm test',                              tags: ['node'],      safe: true },
  'npm.audit':        { cmd: 'npm audit --audit-level=high',          tags: ['node'],      safe: true },
  'npm.start':        { cmd: 'npm start',                             tags: ['node'],      safe: true },
  'node.run':         { cmd: 'node {file}',                           tags: ['node'],      safe: true },
  'node.watch':       { cmd: 'node --watch {file}',                   tags: ['node'],      safe: true },

  // ── PYTHON ─────────────────────────────────────────────────────────────────
  'py.run':           { cmd: 'python {file}',                         tags: ['python'],    safe: true },
  'py.uvicorn':       { cmd: 'uvicorn {module}:app --host 0.0.0.0 --port {port}', tags: ['python'], safe: true },
  'py.pip.install':   { cmd: 'pip install {pkg}',                     tags: ['python'],    safe: true },
  'py.pip.req':       { cmd: 'pip install -r requirements.txt',       tags: ['python'],    safe: true },
  'py.spacy.dl':      { cmd: 'python -m spacy download en_core_web_sm', tags: ['python'], safe: true },
  'py.vllm.serve':    { cmd: 'python -m vllm.entrypoints.openai.api_server --model {model} --port {port}', tags: ['python','gpu'], safe: true },
  'py.test':          { cmd: 'python -m pytest {path} -v',            tags: ['python'],    safe: true },

  // ── DOCKER ─────────────────────────────────────────────────────────────────
  'docker.up':        { cmd: 'docker compose up -d',                  tags: ['docker'],    safe: true },
  'docker.down':      { cmd: 'docker compose down',                   tags: ['docker'],    safe: true },
  'docker.logs':      { cmd: 'docker compose logs -f {service}',      tags: ['docker'],    safe: true },
  'docker.ps':        { cmd: 'docker ps',                             tags: ['docker'],    safe: true },
  'docker.pull':      { cmd: 'docker pull {image}',                   tags: ['docker'],    safe: true },

  // ── DATABASE ───────────────────────────────────────────────────────────────
  'psql.run':         { cmd: 'psql $DATABASE_URL -f {file}',          tags: ['db'],        safe: true },
  'psql.cmd':         { cmd: 'psql $DATABASE_URL -c "{sql}"',         tags: ['db'],        safe: true },
  'psql.tables':      { cmd: 'psql $DATABASE_URL -c "\\dt"',          tags: ['db'],        safe: true },
  'psql.dump':        { cmd: 'pg_dump $DATABASE_URL > {file}',        tags: ['db'],        safe: true },

  // ── NETWORK / HTTP ─────────────────────────────────────────────────────────
  'curl.get':         { cmd: 'curl -s {url}',                         tags: ['http'],      safe: true },
  'curl.post.json':   { cmd: 'curl -s -X POST {url} -H "Content-Type: application/json" -d @{file}', tags: ['http'], safe: true },
  'curl.health':      { cmd: 'curl -s {url}/health',                  tags: ['http'],      safe: true },
  'tailscale.status': { cmd: 'tailscale status',                      tags: ['net'],       safe: true },
  'tailscale.ip':     { cmd: 'tailscale ip',                          tags: ['net'],       safe: true },
  'netstat.listen':   { cmd: 'netstat -ano | grep LISTENING',         tags: ['net'],       safe: true },
  'arp.scan':         { cmd: 'arp -a',                                tags: ['net'],       safe: true },

  // ── AWS / BEDROCK ──────────────────────────────────────────────────────────
  'aws.whoami':       { cmd: 'aws sts get-caller-identity',           tags: ['aws'],       safe: true },
  'aws.models':       { cmd: 'aws bedrock list-foundation-models --region us-east-1', tags: ['aws'], safe: true },
  'aws.s3.ls':        { cmd: 'aws s3 ls s3://{bucket}',              tags: ['aws'],       safe: true },

  // ── SYSTEM ─────────────────────────────────────────────────────────────────
  'sys.gpu':          { cmd: 'nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader', tags: ['sys'], safe: true },
  'sys.procs':        { cmd: 'tasklist',                              tags: ['sys'],       safe: true },
  'sys.kill':         { cmd: 'taskkill /IM {name} /F',               tags: ['sys'],       safe: false, confirm: true },
  'sys.ps.kill':      { cmd: 'powershell Stop-Process -Name {name} -Force', tags: ['sys'], safe: false, confirm: true },
  'sys.env':          { cmd: 'env',                                   tags: ['sys'],       safe: true },
  'sys.ls':           { cmd: 'ls -la {path}',                        tags: ['sys'],       safe: true },
  'sys.tree':         { cmd: 'tree {path} /f',                       tags: ['sys'],       safe: true },
  'sys.ports':        { cmd: 'netstat -ano | findstr :{port}',       tags: ['sys'],       safe: true },
  'sys.disk':         { cmd: 'df -h',                                 tags: ['sys'],       safe: true },

  // ── NASM / ASSEMBLY ────────────────────────────────────────────────────────
  'nasm.build':       { cmd: 'nasm -f bin {src} -o {out}',           tags: ['asm'],       safe: true },
  'nasm.com':         { cmd: 'nasm -f bin {src} -o {out}.com',       tags: ['asm'],       safe: true },

  // ── LEAN 4 ─────────────────────────────────────────────────────────────────
  'lean.check':       { cmd: 'lean --check {file}',                   tags: ['lean'],      safe: true },
  'lake.build':       { cmd: 'lake build',                            tags: ['lean'],      safe: true },
  'lake.test':        { cmd: 'lake test',                             tags: ['lean'],      safe: true },

  // ── FILE OPS ───────────────────────────────────────────────────────────────
  'cat':              { cmd: 'cat {file}',                            tags: ['file'],      safe: true },
  'head':             { cmd: 'head -n {n} {file}',                   tags: ['file'],      safe: true },
  'tail':             { cmd: 'tail -n {n} {file}',                   tags: ['file'],      safe: true },
  'tail.follow':      { cmd: 'tail -f {file}',                       tags: ['file'],      safe: true },
  'wc':               { cmd: 'wc -l {file}',                         tags: ['file'],      safe: true },
  'jq':               { cmd: 'cat {file} | jq "{expr}"',             tags: ['file'],      safe: true },
  'diff':             { cmd: 'diff {a} {b}',                         tags: ['file'],      safe: true },
}

// ── Tag index for quick lookup ────────────────────────────────────────────────
export const TAG_INDEX = {}
for (const [key, def] of Object.entries(COMMAND_BOOK)) {
  for (const tag of def.tags) {
    if (!TAG_INDEX[tag]) TAG_INDEX[tag] = []
    TAG_INDEX[tag].push(key)
  }
}

export function byTag(tag) {
  return (TAG_INDEX[tag] || []).map(k => ({ key: k, ...COMMAND_BOOK[k] }))
}

export function search(query) {
  const q = query.toLowerCase()
  return Object.entries(COMMAND_BOOK)
    .filter(([k, v]) => k.includes(q) || v.cmd.toLowerCase().includes(q) || v.tags.some(t => t.includes(q)))
    .map(([k, v]) => ({ key: k, ...v }))
}

export const TOTAL = Object.keys(COMMAND_BOOK).length
