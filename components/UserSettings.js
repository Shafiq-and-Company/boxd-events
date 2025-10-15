import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import styles from './UserSettings.module.css'

export default function UserSettings() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    biography: ''
  })

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchUserProfile()
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

      if (checkError && checkError.code === 'PGRST116') {
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

        if (insertError) {
          throw insertError
        }
      } else if (checkError) {
        throw checkError
      }
    } catch (err) {
      // Don't throw here, continue with the flow
    }
  }

  // Fetch user profile data from users table
  const fetchUserProfile = async () => {
    try {
      setLoading(true)

      // Ensure user record exists first
      await ensureUserRecord()

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, email, username, biography, phone')
        .eq('id', user.id)
        .single()

      if (profileError) {
        // If user record doesn't exist, try to create it and fetch again
        if (profileError.code === 'PGRST116') {
          await ensureUserRecord()
          // Try fetching again after creating the record
          const { data: retryProfile, error: retryError } = await supabase
            .from('users')
            .select('first_name, last_name, email, username, biography, phone')
            .eq('id', user.id)
            .single()
          
          if (retryError) {
            throw retryError
          }
          
          setUserProfile(buildUserProfile(retryProfile))
          return
        }
        throw profileError
      }

      setUserProfile(buildUserProfile(profile))
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
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

      // Update user metadata (excluding username - handled separately)
      await supabase.auth.updateUser({
        data: {
          first_name: userProfile.first_name.trim(),
          last_name: userProfile.last_name.trim(),
          biography: userProfile.biography.trim(),
          phone: userProfile.phone.trim()
        }
      })
      
      // Update the users table directly (primary source for username)
      await supabase
        .from('users')
        .update({
          first_name: userProfile.first_name.trim(),
          last_name: userProfile.last_name.trim(),
          username: userProfile.username.trim(),
          biography: userProfile.biography.trim(),
          phone: userProfile.phone.trim()
        })
        .eq('id', user.id)

      // Refresh the profile to get the latest data
      await fetchUserProfile()
    } catch (err) {
      console.error('Profile update error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className={styles.userSettings}>
        <h2>User Settings</h2>
        <div className={styles.loading}>Loading your profile...</div>
      </div>
    )
  }

  // Not logged in state
  if (!user) {
    return (
      <div className={styles.userSettings}>
        <h2>User Settings</h2>
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
      <h2>User Settings</h2>
      <p className={styles.pageSubtitle}>Manage your account information and preferences</p>
      
      {/* Tab Switcher */}
      <div className={styles.tabSwitcher}>
        <button
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'payments' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payments
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

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className={styles.settingsForm}>
          <div className={styles.paymentsSection}>
            <h3 className={styles.sectionTitle}>Payments</h3>
            <p className={styles.sectionSubtitle}>Manage your payment settings and connect your Stripe account.</p>
            
            <div className={styles.paymentItem}>
              <div className={styles.paymentIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v6l3-3 3 3V1"/>
                  <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6"/>
                  <path d="M3 12h18"/>
                </svg>
              </div>
              <div className={styles.paymentContent}>
                <h4 className={styles.paymentTitle}>Stripe Account</h4>
                <p className={styles.paymentDescription}>Link your Stripe account to receive payments for your events.</p>
              </div>
              <button type="button" className={styles.paymentButton}>
                Connect Stripe
              </button>
            </div>
          </div>
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
                <p className={styles.securityDescription}>Please follow the instructions in the email to finish setting your password.</p>
              </div>
              <button type="button" className={styles.securityButton}>
                Check Your Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}