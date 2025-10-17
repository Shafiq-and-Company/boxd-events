import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageTitle from './PageTitle'
import styles from './UserSettings.module.css'

export default function UserSettings() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [passwordResetError, setPasswordResetError] = useState(false)
  const [googleAuthStatus, setGoogleAuthStatus] = useState(null)
  
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
    }
  }, [user, authLoading, router])

  // Check Google auth status when user changes
  useEffect(() => {
    if (user) {
      checkGoogleAuthStatus()
    }
  }, [user])

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
      setLoading(true)
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
      
      // Check Google auth status
      checkGoogleAuthStatus()
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Check if user has Google authentication linked
  const checkGoogleAuthStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser?.identities) {
        const hasGoogleAuth = currentUser.identities.some(identity => identity.provider === 'google')
        setGoogleAuthStatus(hasGoogleAuth)
        console.log('Google auth status:', hasGoogleAuth, 'Identities:', currentUser.identities)
      } else {
        setGoogleAuthStatus(false)
      }
    } catch (err) {
      console.error('Error checking Google auth status:', err)
      setGoogleAuthStatus(false)
    }
  }

  // Refresh Google auth status
  const refreshGoogleAuthStatus = async () => {
    setGoogleAuthStatus(null) // Show loading state
    await checkGoogleAuthStatus()
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

  // Loading state
  if (authLoading || loading) {
    return (
      <div className={styles.userSettings}>
        <PageTitle title="User Settings" subtitle="Manage your account information and preferences" />
        <div className={styles.loading}>Loading your profile...</div>
      </div>
    )
  }

  // Not logged in state
  if (!user) {
    return (
      <div className={styles.userSettings}>
        <PageTitle title="User Settings" subtitle="Manage your account information and preferences" />
        <div className={styles.notLoggedIn}>
          <p>You need to be signed in to access your settings.</p>
          <button 
            onClick={() => router.push('/login')}
            className={styles.signInButton}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.userSettings}>
      <PageTitle title="User Settings" subtitle="Manage your account information and preferences" />
      
      {/* Tab Switcher */}
      <div className={styles.tabSwitcher}>
        <button
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'security' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className={styles.settingsForm}>
          <div className={styles.profileSection}>
            <h3 className={styles.sectionTitle}>Profile Information</h3>
            <p className={styles.sectionSubtitle}>Manage your personal information and account details.</p>
          </div>
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

            {/* Email */}
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

            {/* Phone */}
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
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className={styles.settingsForm}>
          <div className={styles.securitySection}>
            <h3 className={styles.sectionTitle}>Password & Security</h3>
            <p className={styles.sectionSubtitle}>Manage your account password and security settings.</p>
            
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
              <button 
                type="button" 
                className={styles.securityButton}
                onClick={handlePasswordReset}
                disabled={passwordResetLoading}
              >
                {passwordResetLoading ? 'Sending...' : 'Password Reset'}
              </button>
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
                {googleAuthStatus === true && (
                  <div className={styles.statusIndicator}>
                    <span className={styles.statusText}>✓ Linked to Google</span>
                  </div>
                )}
                {googleAuthStatus === false && (
                  <div className={styles.statusIndicator}>
                    <span className={styles.statusTextUnlinked}>Not linked to Google</span>
                  </div>
                )}
              </div>
              <div className={styles.googleAuthActions}>
                <button 
                  type="button" 
                  className={styles.refreshButton}
                  onClick={refreshGoogleAuthStatus}
                  disabled={googleAuthStatus === null}
                >
                  Refresh
                </button>
                <div className={`${styles.securityButton} ${googleAuthStatus === true ? styles.linkedButton : styles.unlinkedButton}`}>
                  {googleAuthStatus === true ? '✓ Linked' : googleAuthStatus === false ? 'Not Linked' : 'Checking...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}