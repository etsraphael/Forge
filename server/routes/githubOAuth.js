import { Router } from 'express'
import crypto from 'crypto'
import { Octokit } from '@octokit/rest'

const router = Router()

const clientId = process.env.GITHUB_CLIENT_ID
const clientSecret = process.env.GITHUB_CLIENT_SECRET

// In-memory state store for CSRF protection (state -> timestamp)
const pendingStates = new Map()

// Clean up expired states every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [state, ts] of pendingStates) {
      if (now - ts > 10 * 60 * 1000) pendingStates.delete(state)
    }
  },
  5 * 60 * 1000,
)

function requireOAuthConfig(_req, res, next) {
  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error:
        'GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.',
    })
  }
  next()
}

// GET /api/github/oauth/authorize — return the GitHub authorization URL
router.get('/authorize', requireOAuthConfig, (_req, res) => {
  const state = crypto.randomUUID()
  pendingStates.set(state, Date.now())

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo',
    state,
  })

  res.json({ url: `https://github.com/login/oauth/authorize?${params}` })
})

// GET /api/github/oauth/callback — GitHub redirects here after user authorizes
router.get('/callback', requireOAuthConfig, async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.send(oauthResultPage(false, null, error))
  }

  if (!state || !pendingStates.has(state)) {
    return res.send(
      oauthResultPage(
        false,
        null,
        'Invalid or expired state. Please try again.',
      ),
    )
  }
  pendingStates.delete(state)

  if (!code) {
    return res.send(
      oauthResultPage(false, null, 'No authorization code received.'),
    )
  }

  try {
    const tokenRes = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    )

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return res.send(
        oauthResultPage(
          false,
          null,
          tokenData.error_description || tokenData.error,
        ),
      )
    }

    return res.send(oauthResultPage(true, tokenData.access_token, null))
  } catch (err) {
    return res.send(oauthResultPage(false, null, err.message))
  }
})

// GET /api/github/oauth/repos — list repos for an authenticated user
router.get('/repos', async (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' })
  }

  const token = auth.slice(7)
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 30
  const sort = req.query.sort || 'updated'

  try {
    const octokit = new Octokit({ auth: token })
    const [{ data: repos }, { data: user }] = await Promise.all([
      octokit.rest.repos.listForAuthenticatedUser({
        sort,
        direction: 'desc',
        per_page: perPage,
        page,
      }),
      octokit.rest.users.getAuthenticated(),
    ])

    res.json({
      user: user.login,
      repos: repos.map((r) => ({
        fullName: r.full_name,
        private: r.private,
        description: r.description,
        language: r.language,
        updatedAt: r.updated_at,
      })),
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/**
 * Generate an HTML page that communicates the OAuth result back to the opener
 * via postMessage and then closes itself.
 */
function oauthResultPage(success, token, error) {
  const payload = success
    ? JSON.stringify({ type: 'github-oauth-success', token })
    : JSON.stringify({ type: 'github-oauth-error', error })

  return `<!DOCTYPE html>
<html>
<head><title>GitHub Authorization</title></head>
<body>
  <p>${success ? 'Authorization successful! This window will close automatically.' : 'Authorization failed: ' + (error || 'Unknown error')}</p>
  <script>
    if (window.opener) {
      window.opener.postMessage(${payload}, window.location.origin);
    }
    window.close();
  </script>
</body>
</html>`
}

export default router
