import { createClient } from '@supabase/supabase-js'

const STARTGG_TOKEN_URL = 'https://api.start.gg/oauth/access_token'

const getEnv = (key) => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required env var: ${key}`)
  return value
}

export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query

    if (error) {
      return res.redirect(`/user-settings?startgg=error&reason=${encodeURIComponent(error_description || error)}`)
    }

    if (!code || !state) {
      return res.redirect('/user-settings?startgg=error&reason=missing_code_or_state')
    }

    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
    const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
    const clientId = getEnv('STARTGG_CLIENT_ID')
    const clientSecret = getEnv('STARTGG_CLIENT_SECRET')
    const scopes = getEnv('STARTGG_SCOPES') // e.g. "user.identity user.email"

    // The redirect URI must exactly match what you configured in start.gg app settings
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/startgg/callback`

    // Recover the user's Supabase access token from state
    let supabaseAccessToken
    try {
      supabaseAccessToken = Buffer.from(String(state), 'base64').toString('utf8')
    } catch (_) {
      return res.redirect('/user-settings?startgg=error&reason=invalid_state')
    }

    // Verify the token and get the user id
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(supabaseAccessToken)
    if (userErr || !userData?.user?.id) {
      return res.redirect('/user-settings?startgg=error&reason=user_not_verified')
    }
    const userId = userData.user.id

    // Exchange authorization code for tokens
    const tokenResp = await fetch(STARTGG_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_secret: clientSecret,
        code,
        scope: scopes,
        client_id: clientId,
        redirect_uri: redirectUri,
      })
    })

    if (!tokenResp.ok) {
      const text = await tokenResp.text().catch(() => '')
      return res.redirect(`/user-settings?startgg=error&reason=token_exchange_failed&detail=${encodeURIComponent(text)}`)
    }

    const tokenJson = await tokenResp.json()

    // Persist tokens in auth.user metadata
    const { access_token, refresh_token, expires_in, token_type } = tokenJson
    const existingMeta = userData.user.user_metadata || {}
    const newMeta = {
      ...existingMeta,
      startgg: {
        access_token,
        refresh_token,
        token_type,
        expires_in,
        linked_at: new Date().toISOString(),
      }
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: newMeta
    })
    if (updateErr) {
      return res.redirect('/user-settings?startgg=error&reason=metadata_update_failed')
    }

    return res.redirect('/user-settings?startgg=linked')
  } catch (e) {
    return res.redirect('/user-settings?startgg=error&reason=unexpected')
  }
}


