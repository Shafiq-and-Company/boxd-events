import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import styles from './UserSettings.module.css'

export default function UserSettings() {
  const { user, loading: authLoading, signInWithDiscord } = useAuth()
  const router = useRouter()
  
  // State management
  const [saving, setSaving] = useState(false)
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [passwordResetError, setPasswordResetError] = useState(false)
  const [googleAuthStatus, setGoogleAuthStatus] = useState(null)
  const [discordAuthStatus, setDiscordAuthStatus] = useState(null)
  const [unlinkLoading, setUnlinkLoading] = useState({ google: false, discord: false })
  const [startGGLinked, setStartGGLinked] = useState(null)
  
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    biography: ''
  })

  // Auth redirect and profile loading
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchUserProfile()
      checkAuthStatus('google')
      checkAuthStatus('discord')
      // start.gg link status from user metadata
      const linked = Boolean(user?.user_metadata?.startgg?.access_token)
      setStartGGLinked(linked)
    }
  }, [user, authLoading, router])

  // Ensure user record exists in users table
  const ensureUserRecord = async () => {
    try {
      const { error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (checkError?.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            username: user.email?.split('@')[0] || '',
            biography: user.user_metadata?.biography || '',
            phone: user.user_metadata?.phone || '',
          })

        if (insertError) throw insertError
      } else if (checkError) {
        throw checkError
      }
    } catch (err) {
      // Continue with flow even if user record creation fails
    }
  }

  // Fetch user profile data from users table
  const fetchUserProfile = async () => {
    try {
      await ensureUserRecord()

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, email, username, biography, phone')
        .eq('id', user.id)
        .single()

      if (profileError?.code === 'PGRST116') {
        await ensureUserRecord()
        const { data: retryProfile, error: retryError } = await supabase
          .from('users')
          .select('first_name, last_name, email, username, biography, phone')
          .eq('id', user.id)
          .single()
        
        if (retryError) throw retryError
        setUserProfile(buildUserProfile(retryProfile))
        return
      }

      if (profileError) throw profileError
      setUserProfile(buildUserProfile(profile))
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  // Check authentication status for a provider
  const checkAuthStatus = async (provider) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const hasAuth = currentUser?.identities?.some(identity => identity.provider === provider) || false
      
      if (provider === 'google') {
        setGoogleAuthStatus(hasAuth)
      } else if (provider === 'discord') {
        setDiscordAuthStatus(hasAuth)
      }
    } catch (err) {
      console.error(`Error checking ${provider} auth status:`, err)
      if (provider === 'google') {
        setGoogleAuthStatus(false)
      } else if (provider === 'discord') {
        setDiscordAuthStatus(false)
      }
    }
  }

  // Handle provider unlink
  const handleUnlink = async (provider) => {
    try {
      setUnlinkLoading(prev => ({ ...prev, [provider]: true }))
      
      if (provider === 'google') {
        setGoogleAuthStatus(null)
      } else if (provider === 'discord') {
        setDiscordAuthStatus(null)
      }
      // Resolve identityId for the given provider
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser()
      if (getUserError) throw getUserError

      const identity = currentUser?.identities?.find((i) => i.provider === provider)
      if (!identity) {
        throw new Error(`No ${provider} identity found for this account.`)
      }

      const { error } = await supabase.auth.unlinkIdentity({ identityId: identity.id })
      if (error) throw error
      
      await checkAuthStatus(provider)
      alert(`Successfully unlinked from ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`)
    } catch (err) {
      console.error(`Error unlinking ${provider} auth:`, err)
      const maybeLastMethod = typeof err?.message === 'string' && /last|only|unlink.*primary/i.test(err.message)
      const reason = maybeLastMethod
        ? 'You cannot unlink your only sign-in method. Link another provider first.'
        : (err?.message || 'Unexpected error occurred.')
      alert(`Unable to unlink ${provider.charAt(0).toUpperCase() + provider.slice(1)} account. ${reason}`)
      await checkAuthStatus(provider)
    } finally {
      setUnlinkLoading(prev => ({ ...prev, [provider]: false }))
    }
  }

  // Handle Discord link using AuthContext
  const handleDiscordLink = async () => {
    try {
      const { error } = await signInWithDiscord()
      if (error) throw error
    } catch (err) {
      console.error('Error linking Discord auth:', err)
      alert('Unable to link Discord account. Please try again or contact support.')
    }
  }

  // Handle start.gg OAuth link flow
  const handleStartGGLink = async () => {
    try {
      const clientId = process.env.NEXT_PUBLIC_STARTGG_CLIENT_ID
      const scopes = process.env.NEXT_PUBLIC_STARTGG_SCOPES || 'user.identity user.email'
      if (!clientId) {
        alert('start.gg is not configured. Missing client id.')
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        alert('You must be signed in to link start.gg.')
        return
      }
      const state = typeof window !== 'undefined' ? btoa(accessToken) : ''
      const redirectUri = `${window.location.origin}/api/startgg/callback`
      const authUrl = `https://start.gg/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
      window.location.href = authUrl
    } catch (err) {
      alert('Unable to start start.gg link flow. Please try again.')
    }
  }

  // Helper function to build user profile with fallbacks
  const buildUserProfile = (profile) => {
    const metadata = user.user_metadata || {}
    const emailName = user.email?.split('@')[0] || ''
    const emailParts = emailName.split('.')
    const fallbackFirstName = emailParts[0] || ''
    const fallbackLastName = emailParts[1] || ''

    return {
      first_name: profile.first_name || metadata.first_name || fallbackFirstName,
      last_name: profile.last_name || metadata.last_name || fallbackLastName,
      email: profile.email || user.email || '',
      phone: profile.phone || metadata.phone || '',
      username: profile.username || user.email?.split('@')[0] || '',
      biography: profile.biography || metadata.biography || '',
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setUserProfile(prev => ({ ...prev, [name]: value }))
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)

      // Update user metadata and users table
      await Promise.all([
        supabase.auth.updateUser({
          data: {
            first_name: userProfile.first_name.trim(),
            last_name: userProfile.last_name.trim(),
            biography: userProfile.biography.trim(),
            phone: userProfile.phone.trim()
          }
        }),
        supabase
          .from('users')
          .update({
            first_name: userProfile.first_name.trim(),
            last_name: userProfile.last_name.trim(),
            username: userProfile.username.trim(),
            biography: userProfile.biography.trim(),
            phone: userProfile.phone.trim()
          })
          .eq('id', user.id)
      ])

      await fetchUserProfile()
    } catch (err) {
      console.error('Profile update error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Handle password reset
  const handlePasswordReset = async () => {
    try {
      setPasswordResetLoading(true)
      setPasswordResetMessage('')
      setPasswordResetError(false)
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`
      })
      
      if (error) throw error
      
      setPasswordResetMessage('Password reset email sent! Check your inbox for instructions.')
    } catch (err) {
      console.error('Password reset error:', err)
      setPasswordResetMessage('Failed to send password reset email. Please try again.')
      setPasswordResetError(true)
    } finally {
      setPasswordResetLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className={styles.userSettings}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  // Redirect to splash if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className={styles.userSettings}>
      <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name Fields */}
          <div className={styles.nameFields}>
            <div className={styles.formGroup}>
              <label htmlFor="first_name" className={styles.label}>
                First Name
                <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={userProfile.first_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your first name"
                maxLength={100}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="last_name" className={styles.label}>
                Last Name
                <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={userProfile.last_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your last name"
                maxLength={100}
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
              <span className={styles.required}>*</span>
            </label>
            <div className={styles.usernameInput}>
              <span className={styles.atSymbol}>@</span>
              <input
                type="text"
                id="username"
                name="username"
                value={userProfile.username}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          {/* Email and Phone Fields */}
          <div className={styles.nameFields}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={userProfile.email}
                className={styles.input}
                disabled
                title="Email cannot be changed here. Contact support if you need to change your email."
              />
              <p className={styles.helpText}>
                Email address cannot be changed here. Contact support if you need to update your email.
              </p>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={userProfile.phone}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your phone number"
                maxLength={11}
                pattern="[0-9]*"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Bio */}
          <div className={styles.formGroup}>
            <label htmlFor="biography" className={styles.label}>
              Bio
            </label>
            <textarea
              id="biography"
              name="biography"
              value={userProfile.biography}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Tell us about yourself..."
              maxLength={500}
              rows={2}
            />
            <div className={styles.characterCount}>
              {userProfile.biography.length}/500
            </div>
          </div>

          {/* Save Button */}
          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Password Reset Section */}

          <div className={styles.securityItem}>
            <div className={styles.securityIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className={styles.securityContent}>
              <h4 className={styles.securityTitle}>Account Password</h4>
              <p className={styles.securityDescription}>Reset your password by clicking the button to receive an email with instructions.</p>
              {passwordResetMessage && (
                <p className={`${styles.passwordResetMessage} ${passwordResetError ? styles.error : ''}`}>
                  {passwordResetMessage}
                </p>
              )}
            </div>
            <div className={styles.securityActions}>
              <button 
                type="button" 
                className={styles.securityButton}
                onClick={handlePasswordReset}
                disabled={passwordResetLoading}
              >
                {passwordResetLoading ? 'Sending...' : 'Reset'}
              </button>
            </div>
          </div>

          <div className={styles.securityItem}>
            <div className={styles.securityIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div className={styles.securityContent}>
              <h4 className={styles.securityTitle}>Google Authentication</h4>
              <p className={styles.securityDescription}>
                {googleAuthStatus === true 
                  ? 'Your account is linked to Google. You can sign in using your Google account.'
                  : googleAuthStatus === false 
                  ? 'Your account is not linked to Google. You can link it by signing in with Google.'
                  : 'Checking Google authentication status...'
                }
              </p>
            </div>
            <div className={styles.securityActions}>
              {googleAuthStatus === true && (
                <button 
                  type="button" 
                  className={styles.googleLinkedButton}
                  onClick={() => handleUnlink('google')}
                  disabled={googleAuthStatus === null || unlinkLoading.google}
                  title="Click to unlink Google account"
                >
                  <span className={styles.buttonText}>
                    {unlinkLoading.google ? 'Unlinking...' : 'Linked'}
                  </span>
                  <span className={styles.buttonHoverText}>
                    {unlinkLoading.google ? 'Unlinking...' : 'Unlink'}
                  </span>
                </button>
              )}
              {googleAuthStatus === false && (
                <button 
                  type="button" 
                  className={styles.refreshButton}
                  onClick={() => checkAuthStatus('google')}
                  disabled={googleAuthStatus === null}
                >
                  Refresh
                </button>
              )}
            </div>
          </div>

          <div className={styles.securityItem}>
            <div className={styles.securityIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </div>
            <div className={styles.securityContent}>
              <h4 className={styles.securityTitle}>start.gg Link</h4>
              <p className={styles.securityDescription}>
                {startGGLinked === true
                  ? 'Your account is linked to start.gg.'
                  : startGGLinked === false
                  ? 'Link your start.gg account to connect your profile.'
                  : 'Checking start.gg link status...'}
              </p>
            </div>
            <div className={styles.securityActions}>
              {startGGLinked === true && (
                <button 
                  type="button" 
                  className={styles.discordLinkedButton}
                  disabled
                  title="start.gg linked"
                >
                  Linked
                </button>
              )}
              {startGGLinked === false && (
                <button 
                  type="button" 
                  className={styles.discordUnlinkedButton}
                  onClick={handleStartGGLink}
                  title="Click to link start.gg account"
                >
                  Link
                </button>
              )}
            </div>
          </div>
          
          <div className={styles.securityItem}>
            <div className={styles.securityIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21 .375-.444 .864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <div className={styles.securityContent}>
              <h4 className={styles.securityTitle}>Discord Authentication</h4>
              <p className={styles.securityDescription}>
                {discordAuthStatus === true 
                  ? 'Your account is linked to Discord. You can sign in using your Discord account.'
                  : discordAuthStatus === false 
                  ? 'Your account is not linked to Discord. You can link it by signing in with Discord.'
                  : 'Checking Discord authentication status...'
                }
              </p>
            </div>
            <div className={styles.securityActions}>
              {discordAuthStatus === true && (
                <button 
                  type="button" 
                  className={styles.discordLinkedButton}
                  onClick={() => handleUnlink('discord')}
                  disabled={discordAuthStatus === null || unlinkLoading.discord}
                  title="Click to unlink Discord account"
                >
                  <span className={styles.buttonText}>
                    {unlinkLoading.discord ? 'Unlinking...' : 'Linked'}
                  </span>
                  <span className={styles.buttonHoverText}>
                    {unlinkLoading.discord ? 'Unlinking...' : 'Unlink'}
                  </span>
                </button>
              )}
              {discordAuthStatus === false && (
                <button 
                  type="button" 
                  className={styles.discordUnlinkedButton}
                  onClick={handleDiscordLink}
                  disabled={discordAuthStatus === null}
                  title="Click to link Discord account"
                >
                  Link
                </button>
              )}
            </div>
          </div>
        </form>
    </div>
  )
}


