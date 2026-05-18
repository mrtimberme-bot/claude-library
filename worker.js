// worker.js
const GITHUB_API = 'https://api.github.com'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const COMPONENTS_CACHE_KEY = 'components_v1'
const COMPONENTS_CACHE_TTL = 300 // 5 minutes

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(msg, status = 400) {
  return json({ error: msg }, status)
}

function ghHeaders(env) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'claude-library-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (env.GITHUB_TOKEN) headers.Authorization = `token ${env.GITHUB_TOKEN}`
  return headers
}

function ghGet(path, env) {
  return fetch(`${GITHUB_API}${path}`, { headers: ghHeaders(env) })
}

function ghPost(path, env, body) {
  return fetch(`${GITHUB_API}${path}`, {
    method: 'POST',
    headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function ghPut(path, env, body) {
  return fetch(`${GITHUB_API}${path}`, {
    method: 'PUT',
    headers: { ...ghHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  return token === env.LIBRARY_TOKEN
}

const RATE_LIMIT_MAX    = 10   // max failed attempts
const RATE_LIMIT_WINDOW = 900  // 15 minutes in seconds

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown'
}

async function isRateLimited(request, env) {
  if (!env.LIBRARY_CACHE) return false
  const raw = await env.LIBRARY_CACHE.get(`rl:${clientIp(request)}`)
  if (!raw) return false
  return JSON.parse(raw).count >= RATE_LIMIT_MAX
}

async function recordFailedAuth(request, env) {
  if (!env.LIBRARY_CACHE) return
  const key = `rl:${clientIp(request)}`
  const raw = await env.LIBRARY_CACHE.get(key)
  const data = raw ? JSON.parse(raw) : { count: 0 }
  data.count += 1
  await env.LIBRARY_CACHE.put(key, JSON.stringify(data), { expirationTtl: RATE_LIMIT_WINDOW })
}

async function handleComponents(env) {
  if (env.LIBRARY_CACHE) {
    const cached = await env.LIBRARY_CACHE.get(COMPONENTS_CACHE_KEY)
    if (cached) return json(JSON.parse(cached))
  }

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  let resp = await ghGet(`/repos/${repo}/contents/components.json`, env)
  if (resp.status === 401) {
    // retry without auth (public repo fallback)
    resp = await fetch(`${GITHUB_API}/repos/${repo}/contents/components.json`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'claude-library-worker' },
    })
  }
  if (!resp.ok) return err('Failed to fetch components', 502)
  const data = await resp.json()
  const content = JSON.parse(atob(data.content.replace(/\n/g, '')))

  if (env.LIBRARY_CACHE) {
    await env.LIBRARY_CACHE.put(COMPONENTS_CACHE_KEY, JSON.stringify(content), { expirationTtl: COMPONENTS_CACHE_TTL })
  }

  return json(content)
}

async function invalidateComponentsCache(env) {
  if (env.LIBRARY_CACHE) {
    await env.LIBRARY_CACHE.delete(COMPONENTS_CACHE_KEY)
  }
}

async function handleChat(request, env) {
  const body = await request.json().catch(() => null)
  if (!body?.messages) return err('messages required')

  const resp = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || 'claude-haiku-4-5-20251001',
      max_tokens: Math.min(body.max_tokens || 1024, 4096),
      messages: body.messages,
      system: body.system || 'Je bent een assistent voor de Claude Library — een persoonlijke component library voor Claude Code.',
    }),
  })

  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}))
    return err(e.error?.message || 'Anthropic API error', resp.status)
  }
  return json(await resp.json())
}

// ── REPO SCANNER (used when components.json is absent) ────────────────────────

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end < 0) return {}
  const result = {}
  for (const line of content.slice(3, end).split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (!m) continue
    result[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return result
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63) || 'imported'
}

function firstParagraph(content) {
  return (content
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/^#+\s+.+/gm, '')
    .trim()
    .split(/\n{2,}/)[0] || ''
  ).trim().slice(0, 280)
}

function detectType(path, hint) {
  if (hint) return hint
  if (/\/agents?\//i.test(path)) return 'agent'
  if (/\/mcp\//i.test(path)) return 'mcp'
  if (/\/memory\//i.test(path)) return 'memory'
  if (/\/plugin/i.test(path)) return 'plugin'
  if (/\/orch/i.test(path)) return 'orch'
  return 'skill'
}

function buildEntry(path, content, hintType, src) {
  const fm = parseFrontmatter(content)
  const folder = path.split('/').slice(-2, -1)[0] || path.split('/').pop().replace(/\.[^.]+$/, '')
  const type = detectType(path, hintType)
  const name = fm.name || fm.title || folder
  const desc = fm.description || fm.desc || firstParagraph(content)
  const tags = fm.tags ? fm.tags.split(',').map(t => t.trim()).filter(Boolean) : [type]
  if (!tags.includes('imported')) tags.push('imported')
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: slugify(fm.id || name),
    name,
    type,
    status: fm.status || 'active',
    version: fm.version || 'v1.0',
    desc,
    usage: fm.usage || fm.trigger || '',
    tags: tags.length ? tags : [type, 'imported'],
    author: fm.author || src.split('/')[0],
    updated: fm.updated || fm.date || today,
    path: `imported/${src.replace('/', '_')}/${path}`,
  }
}

async function aiGenerateEntries(files, src, env) {
  const system = `Generate structured component entries for a Claude Library based on files from a GitHub repo.
Return a JSON array. Each item:
{ "id": "kebab-case", "name": "Readable name", "type": "skill|agent|mcp|memory|plugin|orch|api|arch|infra", "status": "active", "version": "v1.0", "desc": "max 200 char description", "usage": "when and how to use", "tags": ["tag1"], "path": "<original file path>" }
Rules: id is lowercase a-z 0-9 hyphens max 63 chars. desc must always be filled in and informative.`

  const userContent = `Repo: ${src}\n\n` + files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n')
  try {
    const raw = await callAnthropic(env, { model: 'claude-haiku-4-5-20251001', system, userContent, maxTokens: 2048 })
    const arrMatch = raw.match(/\[[\s\S]*\]/)
    if (!arrMatch) return files.map(f => f.entry)
    const today = new Date().toISOString().slice(0, 10)
    return JSON.parse(arrMatch[0]).map(item => {
      const tags = Array.isArray(item.tags) ? item.tags : []
      if (!tags.includes('imported')) tags.push('imported')
      return { ...item, tags, author: item.author || src.split('/')[0], updated: item.updated || today, path: `imported/${src.replace('/', '_')}/${item.path || ''}` }
    })
  } catch {
    return files.map(f => f.entry)
  }
}

async function scanRepoForComponents(src, env) {
  const treeResp = await ghGet(`/repos/${src}/git/trees/HEAD?recursive=1`, env)
  if (!treeResp.ok) throw new Error(treeResp.status === 404 ? 'Repo not found or not accessible' : 'Cannot read repo tree')
  const { tree } = await treeResp.json()

  // Find files by priority pattern
  const PATTERNS = [
    { re: /SKILL\.md$/i,                           type: 'skill'  },
    { re: /\/agents?\/[^/]+\.(md|yaml|yml)$/i,     type: 'agent'  },
    { re: /\/mcp\/[^/]+\/[^/]+\.(yml|yaml|json|md)$/i, type: 'mcp' },
    { re: /\/memory\/[^/]+\.(md|json)$/i,          type: 'memory' },
    { re: /\/plugins?\/[^/]+\.(md|json)$/i,        type: 'plugin' },
    { re: /\/orch[^/]*\/[^/]+\.(md|json)$/i,       type: 'orch'   },
    { re: /\.md$/i,                                type: null     },
  ]

  const seen = new Set()
  const candidates = []
  for (const pat of PATTERNS) {
    for (const file of tree) {
      if (file.type !== 'blob' || seen.has(file.path) || (file.size || 0) > 80_000) continue
      if (pat.re.test(file.path)) {
        seen.add(file.path)
        candidates.push({ path: file.path, hintType: pat.type })
        if (candidates.length >= 15) break
      }
    }
    if (candidates.length >= 15) break
  }

  if (!candidates.length) throw new Error('No recognizable skill/agent/mcp files found in repo')

  const good = [], needsAI = []
  for (const cand of candidates) {
    const r = await ghGet(`/repos/${src}/contents/${cand.path}`, env)
    if (!r.ok) continue
    const d = await r.json()
    const content = atob(d.content.replace(/\n/g, ''))
    const entry = buildEntry(cand.path, content, cand.hintType, src)
    if (entry.desc && entry.desc.length > 30) {
      good.push(entry)
    } else {
      needsAI.push({ path: cand.path, content: content.slice(0, 1500), entry })
    }
  }

  if (needsAI.length) {
    const aiEntries = await aiGenerateEntries(needsAI, src, env)
    good.push(...aiEntries)
  }

  // Deduplicate by id
  const seen_ids = new Set()
  return good.filter(e => e.id && e.name && !seen_ids.has(e.id) && seen_ids.add(e.id))
}

// ── IMPORT REPO ────────────────────────────────────────────────────────────────

async function handleImportRepo(request, env) {
  const body = await request.json().catch(() => null)
  if (!body?.repo) return err('"repo" required — format: "owner/repo"')

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(body.repo))
    return err('Invalid repo format. Use "owner/repo"')

  const lib = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const src = body.repo
  let autoScanned = false

  // 1. Try components.json
  let components
  const compResp = await ghGet(`/repos/${src}/contents/components.json`, env)
  if (compResp.ok) {
    try {
      const raw = await compResp.json()
      components = JSON.parse(atob(raw.content.replace(/\n/g, '')))
      if (!Array.isArray(components)) throw new Error()
    } catch {
      return err('components.json in source repo is not a valid JSON array')
    }
  } else {
    // 2. Auto-scan
    try {
      components = await scanRepoForComponents(src, env)
      autoScanned = true
    } catch (e) {
      return err(`Geen components.json gevonden in ${src}, auto-scan ook mislukt: ${e.message}`, 404)
    }
    if (!components.length) return err(`Geen components.json en geen herkenbare bestanden gevonden in ${src}`, 404)
  }

  // Ensure every imported component carries an 'imported' tag
  components = components.map(c => {
    const tags = Array.isArray(c.tags) ? c.tags : []
    if (!tags.includes('imported')) tags.push('imported')
    return { ...c, tags }
  })

  if (!autoScanned) {
    const required = ['id', 'name', 'type', 'desc', 'path']
    const invalid = components.filter(c => required.some(f => !c[f]))
    if (invalid.length) return err(`Components missing required fields: ${invalid.map(c => c.id || '?').join(', ')}`)
  }

  if (components.length > 50) return err('Too many components in source repo (max 50)')

  const prefix = `imported/${src.replace('/', '_')}`
  const files = [
    { path: `${prefix}/components.json`, content: JSON.stringify(components, null, 2) },
  ]

  for (const comp of components) {
    if (!comp.path || !comp.path.endsWith('.md')) continue
    if (!/^[a-zA-Z0-9._\-\/]+\.md$/.test(comp.path)) continue
    const filePath = comp.path.startsWith('imported/') ? comp.path.replace(/^imported\/[^/]+\//, '') : comp.path
    const r = await ghGet(`/repos/${src}/contents/${filePath}`, env)
    if (!r.ok) continue
    const d = await r.json()
    files.push({ path: `${prefix}/${filePath}`, content: atob(d.content.replace(/\n/g, '')) })
  }

  const refResp = await ghGet(`/repos/${lib}/git/refs/heads/main`, env)
  if (!refResp.ok) return err('Failed to read main branch', 502)
  const mainSha = (await refResp.json()).object.sha

  const branch = `import/${src.replace('/', '-')}-${Date.now()}`
  const branchResp = await ghPost(`/repos/${lib}/git/refs`, env, { ref: `refs/heads/${branch}`, sha: mainSha })
  if (!branchResp.ok) return err('Failed to create branch', 502)

  const commitErrors = []
  for (const file of files) {
    const encoded = btoa(unescape(encodeURIComponent(file.content)))
    const payload = { message: `feat: import ${file.path} from ${src}`, content: encoded, branch }
    const existing = await ghGet(`/repos/${lib}/contents/${file.path}?ref=${branch}`, env)
    if (existing.ok) payload.sha = (await existing.json()).sha
    const putResp = await ghPut(`/repos/${lib}/contents/${file.path}`, env, payload)
    if (!putResp.ok) commitErrors.push(file.path)
  }

  if (commitErrors.length) return err(`Failed to commit ${commitErrors.length} file(s): ${commitErrors.join(', ')}`, 502)

  const scanNote = autoScanned ? '\n\n> ℹ️ Geen `components.json` gevonden — entries automatisch gegenereerd via repo-scan + AI.\n' : ''
  const prResp = await ghPost(`/repos/${lib}/pulls`, env, {
    title: `Import: ${src} (${components.length} component${components.length !== 1 ? 's' : ''})${autoScanned ? ' — auto-scan' : ''}`,
    body: `## Geïmporteerd van \`${src}\`\n${scanNote}\n${components.map(c => `- **${c.name}** (\`${c.type}\`) — ${c.desc}`).join('\n')}\n\n---\n_Automatisch aangemaakt door Claude Library Worker_`,
    head: branch,
    base: 'main',
  })

  if (!prResp.ok) {
    const e = await prResp.json().catch(() => ({}))
    return err(`PR creation failed: ${e.message || prResp.status}`, 502)
  }

  const pr = await prResp.json()
  return json({
    success: true,
    pr_url: pr.html_url,
    pr_number: pr.number,
    components_imported: components.length,
    files_committed: files.length,
    auto_scanned: autoScanned,
    branch,
  })
}

async function callAnthropic(env, { model, system, userContent, maxTokens }) {
  const resp = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    let msg = 'Anthropic ' + resp.status
    try { msg = JSON.parse(text).error?.message || msg } catch {}
    throw new Error(msg + (text && !text.includes(msg) ? ': ' + text.slice(0, 200) : ''))
  }
  const data = await resp.json()
  return data.content?.[0]?.text || ''
}

async function readSkillMd(path, repo, env) {
  const r = await ghGet(`/repos/${repo}/contents/${path}`, env)
  if (!r.ok) return null
  const d = await r.json()
  return atob(d.content.replace(/\n/g, ''))
}

async function readComponentsJson(repo, env) {
  const r = await ghGet(`/repos/${repo}/contents/components.json`, env)
  if (!r.ok) throw new Error('Kon components.json niet ophalen')
  const d = await r.json()
  const components = JSON.parse(atob(d.content.replace(/\n/g, '')))
  return { components, sha: d.sha }
}

async function handleAnalyzeSkill(request, env) {
  try {
  const body = await request.json().catch(() => null)
  if (!body?.id) return err('"id" required')

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components } = await readComponentsJson(repo, env)
  const comp = components.find(c => c.id === body.id)
  if (!comp) return err('Component not found', 404)
  if (comp.type !== 'skill') return err('Only skills can be analyzed')

  const skillMd = comp.path ? await readSkillMd(comp.path, repo, env) : null

  const otherSkills = components
    .filter(c => c.type === 'skill' && c.id !== comp.id)
    .map(c => `- ${c.name}: ${c.desc} | usage: ${c.usage}`)
    .join('\n')

  const system = `Je bent een expert in het beoordelen van Claude Code skill files.
Je analyseert een skill op 4 dimensies en geeft een score van 0-100 per dimensie plus concrete verbeterpunten.
Geef altijd een JSON response in dit exacte formaat:
{
  "scores": {
    "volledigheid": <0-100>,
    "triggers": <0-100>,
    "overlap": <0-100>,
    "kwaliteit": <0-100>
  },
  "issues": ["...", "..."],
  "summary": "..."
}
Scores betekenis:
- volledigheid: zijn alle velden (desc, usage, tags, path) ingevuld en niet triviaal?
- triggers: zijn trigger-zinnen specifiek, actionable en niet te breed?
- overlap: is de skill duidelijk gedifferentieerd van andere skills?
- kwaliteit: algehele schrijfkwaliteit van desc en usage.
Geef maximaal 5 issues. Wees specifiek en actionable.`

  const userContent = `Skill om te analyseren:
Naam: ${comp.name}
ID: ${comp.id}
Desc: ${comp.desc}
Usage: ${comp.usage || '(leeg)'}
Tags: ${(comp.tags || []).join(', ')}
Path: ${comp.path}

${skillMd ? `SKILL.md inhoud:\n${skillMd.slice(0, 3000)}` : '(SKILL.md niet beschikbaar)'}

Andere skills in de library (voor overlap-check):
${otherSkills.slice(0, 2000)}`

  const raw = await callAnthropic(env, {
    model: 'claude-haiku-4-5-20251001',
    system,
    userContent,
    maxTokens: 1024,
  })

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return err('Kon analyse niet parsen')
  const result = JSON.parse(jsonMatch[0])
  return json(result)
  } catch (e) { return err('analyze-skill: ' + (e?.message || String(e)), 500) }
}

async function handleAnalyzeAll(request, env) {
  try {
  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components } = await readComponentsJson(repo, env)
  const skills = components.filter(c => c.type === 'skill')

  if (!skills.length) return json({ skills: [], overall: 0 })

  const system = `Je analyseert meerdere Claude Code skills tegelijk. Voor elke skill geef je een JSON object.
Geef een JSON array terug met voor elke skill:
{ "id": "...", "scores": { "volledigheid": 0-100, "triggers": 0-100, "overlap": 0-100, "kwaliteit": 0-100 }, "top_issue": "..." }
Analyseer op: volledigheid (velden ingevuld), triggers (specifiek en actionable), overlap (uniek t.o.v. anderen), kwaliteit (schrijfstijl).`

  const userContent = `Analyseer deze ${skills.length} skills:\n\n` + skills.map(s =>
    `ID: ${s.id}\nNaam: ${s.name}\nDesc: ${s.desc}\nUsage: ${s.usage || '(leeg)'}\nTags: ${(s.tags || []).join(', ')}`
  ).join('\n\n---\n\n')

  const raw = await callAnthropic(env, {
    model: 'claude-haiku-4-5-20251001',
    system,
    userContent,
    maxTokens: 4096,
  })

  const arrMatch = raw.match(/\[[\s\S]*\]/)
  if (!arrMatch) return err('Kon bulk analyse niet parsen')
  const items = JSON.parse(arrMatch[0])

  const enriched = items.map(item => {
    const avg = Math.round(Object.values(item.scores).reduce((a, b) => a + b, 0) / 4)
    const comp = skills.find(s => s.id === item.id)
    return { ...item, name: comp?.name || item.id, avg }
  })

  const overall = enriched.length
    ? Math.round(enriched.reduce((s, i) => s + i.avg, 0) / enriched.length)
    : 0

  return json({ skills: enriched, overall })
  } catch (e) { return err('analyze-all: ' + (e?.message || String(e)), 500) }
}

async function handleEnrichUsage(request, env) {
  try {
  const body = await request.json().catch(() => null)
  if (!body?.id) return err('"id" required')

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components } = await readComponentsJson(repo, env)
  const comp = components.find(c => c.id === body.id)
  if (!comp) return err('Component not found', 404)
  if (comp.type !== 'skill') return err('Only skills can be enriched')

  const skillMd = comp.path ? await readSkillMd(comp.path, repo, env) : null

  const system = `Je schrijft verbeterde usage-beschrijvingen voor Claude Code skills.
Een goede usage-tekst bevat:
1. Een concrete zin die uitlegt wanneer de skill te gebruiken
2. 5 specifieke trigger-zinnen die een gebruiker zou typen om de skill te activeren

Geef JSON terug in dit exacte formaat:
{
  "proposed_usage": "één zin die uitlegt wanneer en waarom je deze skill activeert",
  "triggers": ["trigger zin 1", "trigger zin 2", "trigger zin 3", "trigger zin 4", "trigger zin 5"]
}
Triggers moeten realistisch zijn — zinnen die een developer daadwerkelijk zou typen.`

  const userContent = `Skill:
Naam: ${comp.name}
Huidige usage: ${comp.usage || '(leeg)'}
Desc: ${comp.desc}
Tags: ${(comp.tags || []).join(', ')}

${skillMd ? `SKILL.md:\n${skillMd.slice(0, 2000)}` : ''}`

  const raw = await callAnthropic(env, {
    model: 'claude-haiku-4-5-20251001',
    system,
    userContent,
    maxTokens: 512,
  })

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return err('Kon verrijking niet parsen')
  const result = JSON.parse(jsonMatch[0])
  return json({ current_usage: comp.usage || '', ...result })
  } catch (e) { return err('enrich-usage: ' + (e?.message || String(e)), 500) }
}

async function handleSaveEnrichment(request, env) {
  const body = await request.json().catch(() => null)
  if (!body?.id || body.usage === undefined) return err('"id" and "usage" required')

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components, sha } = await readComponentsJson(repo, env)

  const idx = components.findIndex(c => c.id === body.id)
  if (idx < 0) return err('Component not found', 404)

  const today = new Date().toISOString().slice(0, 10)
  components[idx] = { ...components[idx], usage: body.usage, updated: today }

  const putResp = await ghPut(`/repos/${repo}/contents/components.json`, env, {
    message: `chore: usage verrijkt voor ${body.id}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(components, null, 2)))),
    sha,
  })

  if (!putResp.ok) {
    const e = await putResp.json().catch(() => ({}))
    return err(`Kon niet opslaan: ${e.message || putResp.status}`, 502)
  }
  await invalidateComponentsCache(env)
  return json({ ok: true })
}

async function handleUploadSkill(request, env) {
  const body = await request.json().catch(() => null)
  if (!body) return err('Invalid JSON body')

  const { name, desc, content, tags, version, status } = body

  if (!name) return err('"name" is required')
  if (!/^[a-z0-9-]+$/.test(name)) return err('"name" mag alleen a-z, 0-9 en hyphens bevatten')
  if (!content) return err('"content" is required')

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const today = new Date().toISOString().slice(0, 10)
  const ver = version || '1.0.0'
  const st = status || 'active'
  const tagsArr = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : [])

  // Build SKILL.md content
  const skillMd = [
    `# ${name}`,
    '',
    desc ? `${desc}` : '',
    '',
    `**Versie:** ${ver}`,
    `**Status:** ${st}`,
    `**Auteur:** Timothy Stekkinger`,
    `**Bijgewerkt:** ${today}`,
    tagsArr.length ? `**Tags:** ${tagsArr.join(', ')}` : '',
    '',
    '---',
    '',
    content,
  ].filter(line => line !== null).join('\n')

  const skillPath = `skills/${name}/SKILL.md`

  // Check if SKILL.md already exists (for sha)
  const existingSkill = await ghGet(`/repos/${repo}/contents/${skillPath}`, env)
  const skillPayload = {
    message: `feat: skill ${name} toegevoegd via cockpit`,
    content: btoa(unescape(encodeURIComponent(skillMd))),
  }
  if (existingSkill.ok) {
    const existingData = await existingSkill.json()
    skillPayload.sha = existingData.sha
  }

  const putResp = await ghPut(`/repos/${repo}/contents/${skillPath}`, env, skillPayload)
  if (!putResp.ok) {
    const e = await putResp.json().catch(() => ({}))
    return err(`Kon SKILL.md niet opslaan: ${e.message || putResp.status}`, 502)
  }

  // Update components.json
  const compResp = await ghGet(`/repos/${repo}/contents/components.json`, env)
  if (!compResp.ok) return err('Kon components.json niet ophalen', 502)

  const compData = await compResp.json()
  let components
  try {
    components = JSON.parse(atob(compData.content.replace(/\n/g, '')))
    if (!Array.isArray(components)) throw new Error()
  } catch {
    return err('components.json is geen geldige JSON array', 502)
  }

  const newEntry = {
    id: name,
    name,
    type: 'skill',
    version: ver,
    status: st,
    desc: desc || '',
    usage: '',
    author: 'Timothy Stekkinger',
    updated: today,
    path: skillPath,
    tags: tagsArr,
  }

  const idx = components.findIndex(c => c.id === name)
  if (idx >= 0) {
    components[idx] = newEntry
  } else {
    components.push(newEntry)
  }

  const compPutResp = await ghPut(`/repos/${repo}/contents/components.json`, env, {
    message: `chore: components.json bijgewerkt voor skill ${name}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(components, null, 2)))),
    sha: compData.sha,
  })

  if (!compPutResp.ok) {
    const e = await compPutResp.json().catch(() => ({}))
    return err(`Kon components.json niet bijwerken: ${e.message || compPutResp.status}`, 502)
  }

  await invalidateComponentsCache(env)
  return json({ success: true, path: skillPath })
}

/* ── CHECK UPDATES ── */
async function handleCheckUpdates(env) {
  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components } = await readComponentsJson(repo, env)
  const imported = components.filter(c => c.source_repo && c.source_sha)

  const updates = []
  for (const comp of imported) {
    const r = await ghGet(`/repos/${comp.source_repo}/contents/${comp.source_path}`, env)
    if (!r.ok) continue
    const data = await r.json()
    if (data.sha !== comp.source_sha) {
      updates.push({
        id: comp.id,
        name: comp.name,
        source_repo: comp.source_repo,
        source_path: comp.source_path,
        current_sha: comp.source_sha,
        latest_sha: data.sha,
        diff_url: `https://github.com/${comp.source_repo}/compare/${comp.source_sha}...${data.sha}`,
      })
    }
  }
  return json({ updates, checked: imported.length, outdated: updates.length })
}

/* ── UPDATE SKILL ── */
async function handleUpdateSkill(request, env) {
  const body = await request.json().catch(() => null)
  if (!body?.id) return err('"id" required')

  const repo = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const { components, sha: compSha } = await readComponentsJson(repo, env)
  const idx = components.findIndex(c => c.id === body.id)
  if (idx < 0) return err('Component not found', 404)

  const comp = components[idx]
  if (!comp.source_repo || !comp.source_path) return err('Component has no source_repo/source_path — cannot update', 400)

  const srcResp = await ghGet(`/repos/${comp.source_repo}/contents/${comp.source_path}`, env)
  if (!srcResp.ok) return err(`Could not fetch source: ${srcResp.status}`, 502)
  const srcData = await srcResp.json()

  if (srcData.sha === comp.source_sha) return json({ ok: true, message: 'Already up to date', up_to_date: true })

  const newContent = atob(srcData.content.replace(/\n/g, ''))
  const libFileSha = await ghGet(`/repos/${repo}/contents/${comp.path}`, env)
    .then(r => r.ok ? r.json().then(d => d.sha) : null)

  const putResp = await ghPut(`/repos/${repo}/contents/${comp.path}`, env, {
    message: `chore: update ${comp.id} van ${comp.source_repo} (${srcData.sha.slice(0,8)})`,
    content: btoa(unescape(encodeURIComponent(newContent))),
    ...(libFileSha ? { sha: libFileSha } : {}),
  })
  if (!putResp.ok) {
    const e = await putResp.json().catch(() => ({}))
    return err(`Kon skill niet updaten: ${e.message || putResp.status}`, 502)
  }

  const today = new Date().toISOString().slice(0, 10)
  components[idx] = { ...comp, source_sha: srcData.sha, updated: today }

  const compPutResp = await ghPut(`/repos/${repo}/contents/components.json`, env, {
    message: `chore: source_sha bijgewerkt voor ${comp.id}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(components, null, 2)))),
    sha: compSha,
  })
  if (!compPutResp.ok) return err('Skill bijgewerkt maar components.json update mislukt', 502)

  await invalidateComponentsCache(env)
  return json({ ok: true, updated: true, new_sha: srcData.sha, diff_url: `https://github.com/${comp.source_repo}/compare/${comp.source_sha}...${srcData.sha}` })
}

/* ── SCHEDULED CRON: dagelijkse update-check + ntfy notificatie ── */
async function runScheduledUpdateCheck(env) {
  const resp = await handleCheckUpdates(env)
  const data = await resp.json()
  if (!data.outdated || !env.NTFY_TOPIC) return

  const msg = `Claude Library: ${data.outdated} skill${data.outdated > 1 ? 's' : ''} heeft een update beschikbaar!\n` +
    data.updates.map(u => `• ${u.name} (${u.source_repo})`).join('\n')

  await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'Title': 'Library Update Beschikbaar', 'Priority': '3' },
    body: msg,
  }).catch(() => {})
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledUpdateCheck(env))
  },

  async fetch(request, env) {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS })

    const { pathname } = new URL(request.url)

    try {
      if (pathname === '/components' && request.method === 'GET')
        return handleComponents(env)

      if (pathname === '/check-updates' && request.method === 'GET')
        return handleCheckUpdates(env)

      const authPaths = ['/chat','/import-repo','/upload-skill','/analyze-skill','/analyze-all','/enrich-usage','/save-enrichment','/cache-refresh','/update-skill']
      if (authPaths.includes(pathname)) {
        if (request.method !== 'POST') return err('POST required', 405)
        if (await isRateLimited(request, env))
          return new Response(JSON.stringify({ error: 'Too many failed attempts — try again in 15 minutes' }), {
            status: 429,
            headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW) },
          })
        if (!checkAuth(request, env)) {
          await recordFailedAuth(request, env)
          return err('Unauthorized', 401)
        }
        if (pathname === '/chat') return handleChat(request, env)
        if (pathname === '/import-repo') return handleImportRepo(request, env)
        if (pathname === '/upload-skill') return handleUploadSkill(request, env)
        if (pathname === '/analyze-skill') return handleAnalyzeSkill(request, env)
        if (pathname === '/analyze-all') return handleAnalyzeAll(request, env)
        if (pathname === '/enrich-usage') return handleEnrichUsage(request, env)
        if (pathname === '/save-enrichment') return handleSaveEnrichment(request, env)
        if (pathname === '/update-skill') return handleUpdateSkill(request, env)
        if (pathname === '/cache-refresh') {
          await invalidateComponentsCache(env)
          return json({ ok: true, message: 'Cache invalidated' })
        }
      }

      return err('Not found', 404)
    } catch (e) {
      return err('Internal server error: ' + (e?.message || String(e)), 500)
    }
  },
}
