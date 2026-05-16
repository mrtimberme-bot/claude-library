// worker.js
const GITHUB_API = 'https://api.github.com'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

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

async function handleComponents(env) {
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
  return json(content)
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

async function handleImportRepo(request, env) {
  const body = await request.json().catch(() => null)
  if (!body?.repo) return err('"repo" required — format: "owner/repo"')

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(body.repo))
    return err('Invalid repo format. Use "owner/repo"')

  const lib = env.LIBRARY_REPO || 'mrtimberme-bot/claude-library'
  const src = body.repo

  const compResp = await ghGet(`/repos/${src}/contents/components.json`, env)
  if (!compResp.ok) return err(`components.json not found in ${src}`, 404)

  let components
  try {
    const raw = await compResp.json()
    components = JSON.parse(atob(raw.content.replace(/\n/g, '')))
    if (!Array.isArray(components)) throw new Error()
  } catch {
    return err('components.json in source repo is not a valid JSON array')
  }

  const required = ['id', 'name', 'type', 'desc', 'path']
  const invalid = components.filter(c => required.some(f => !c[f]))
  if (invalid.length)
    return err(`Components missing required fields: ${invalid.map(c => c.id || '?').join(', ')}`)

  if (components.length > 50)
    return err('Too many components in source repo (max 50)')

  const prefix = `imported/${src.replace('/', '_')}`
  const files = [
    { path: `${prefix}/components.json`, content: JSON.stringify(components, null, 2) },
  ]

  for (const comp of components) {
    if (!comp.path.endsWith('.md')) continue
    if (!/^[a-zA-Z0-9._\-\/]+\.md$/.test(comp.path)) continue  // skip unsafe paths
    const r = await ghGet(`/repos/${src}/contents/${comp.path}`, env)
    if (!r.ok) continue
    const d = await r.json()
    files.push({
      path: `${prefix}/${comp.path}`,
      content: atob(d.content.replace(/\n/g, '')),
    })
  }

  const refResp = await ghGet(`/repos/${lib}/git/refs/heads/main`, env)
  if (!refResp.ok) return err('Failed to read main branch', 502)
  const mainSha = (await refResp.json()).object.sha

  const branch = `import/${src.replace('/', '-')}-${Date.now()}`
  const branchResp = await ghPost(`/repos/${lib}/git/refs`, env, {
    ref: `refs/heads/${branch}`,
    sha: mainSha,
  })
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

  if (commitErrors.length) {
    return err(`Failed to commit ${commitErrors.length} file(s): ${commitErrors.join(', ')}`, 502)
  }

  const prResp = await ghPost(`/repos/${lib}/pulls`, env, {
    title: `Import: ${src} (${components.length} component${components.length !== 1 ? 's' : ''})`,
    body: `## Geïmporteerd van \`${src}\`\n\n${components.map(c => `- **${c.name}** (\`${c.type}\`) — ${c.desc}`).join('\n')}\n\n---\n_Automatisch aangemaakt door Claude Library Worker_`,
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
    branch,
  })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS })

    const { pathname } = new URL(request.url)

    try {
      if (pathname === '/components' && request.method === 'GET')
        return handleComponents(env)

      if (pathname === '/chat' || pathname === '/import-repo') {
        if (request.method !== 'POST') return err('POST required', 405)
        if (!checkAuth(request, env)) return err('Unauthorized', 401)
        if (pathname === '/chat') return handleChat(request, env)
        return handleImportRepo(request, env)
      }

      return err('Not found', 404)
    } catch {
      return err('Internal server error', 500)
    }
  },
}
