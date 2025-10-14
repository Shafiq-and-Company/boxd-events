import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import styles from './UserSettings.module.css'

export default function UserSettings() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    bio: '',
    avatar_url: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    twitter: '',
    tiktok: '',
    website: ''
  })
  const [gamingAccounts, setGamingAccounts] = useState({
    ea: { linked: false, username: '' },
    startgg: { linked: false, username: '' },
    battlefy: { linked: false, username: '' },
    smashersgg: { linked: false, username: '' },
    battlenet: { linked: false, username: '' }
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUserProfile()
    }
  }, [user, authLoading, router])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      // Get username, bio, avatar, phone, and social links from user metadata or generate from email
      const username = user.user_metadata?.username || user.email?.split('@')[0] || ''
      const bio = user.user_metadata?.bio || ''
      const avatar_url = user.user_metadata?.avatar_url || ''
      const phone = user.user_metadata?.phone || ''
      const instagram = user.user_metadata?.instagram || ''
      const youtube = user.user_metadata?.youtube || ''
      const linkedin = user.user_metadata?.linkedin || ''
      const twitter = user.user_metadata?.twitter || ''
      const tiktok = user.user_metadata?.tiktok || ''
      const website = user.user_metadata?.website || ''

      setUserProfile({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || user.email || '',
        phone: phone,
        username: username,
        bio: bio,
        avatar_url: avatar_url,
        instagram: instagram,
        youtube: youtube,
        linkedin: linkedin,
        twitter: twitter,
        tiktok: tiktok,
        website: website
      })
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Failed to load your profile information')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      setError('')

      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user profile with new avatar URL
      setUserProfile(prev => ({
        ...prev,
        avatar_url: data.publicUrl
      }))

      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: userProfile.first_name,
          last_name: userProfile.last_name
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Update username, bio, avatar, phone, and social links in user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          username: userProfile.username,
          bio: userProfile.bio,
          avatar_url: userProfile.avatar_url,
          phone: userProfile.phone,
          instagram: userProfile.instagram,
          youtube: userProfile.youtube,
          linkedin: userProfile.linkedin,
          twitter: userProfile.twitter,
          tiktok: userProfile.tiktok,
          website: userProfile.website
        }
      })

      if (metadataError) {
        throw metadataError
      }

      setSuccess('Profile updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignIn = () => {
    router.push('/login')
  }

  const handleGamingLink = (platform) => {
    // Toggle the linked status for the gaming platform
    setGamingAccounts(prev => ({
      ...prev,
      [platform]: {
        linked: !prev[platform].linked,
        username: !prev[platform].linked ? `user@${platform}.com` : ''
      }
    }))
  }

  if (authLoading || loading) {
    return (
      <div className={styles.userSettings}>
        <h2>User Settings</h2>
        <div className={styles.loading}>Loading your profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.userSettings}>
        <h2>User Settings</h2>
        <div className={styles.notLoggedIn}>
          <p>You need to be signed in to access your settings.</p>
          <button 
            onClick={handleSignIn}
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
      
      <div className={styles.profileSection}>
        <div className={styles.profilePicture}>
          <div className={styles.avatarContainer}>
            {userProfile.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt="Profile" 
                className={styles.avatarImage}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {userProfile.first_name ? userProfile.first_name.charAt(0).toUpperCase() : 
                 userProfile.email ? userProfile.email.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className={styles.uploadOverlay}>
              <label htmlFor="avatar-upload" className={styles.uploadLabel}>
                {uploading ? (
                  <div className={styles.uploadSpinner}>⋯</div>
                ) : (
                  <svg className={styles.uploadIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className={styles.hiddenInput}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.settingsForm}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.nameFields}>
            <div className={styles.formGroup}>
              <label htmlFor="first_name" className={styles.label}>
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={userProfile.first_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your first name"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="last_name" className={styles.label}>
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={userProfile.last_name}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
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
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="bio" className={styles.label}>
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={userProfile.bio}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Tell us about yourself..."
              rows={2}
            />
          </div>

          <div className={styles.socialSection}>
            <h3 className={styles.sectionTitle}>Social links</h3>
            <p className={styles.sectionSubtitle}>Connect your social media accounts to share your events and connect with other users.</p>
            <div className={styles.socialGrid}>
              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    instagram.com/
                  </span>
                  <input
                    type="text"
                    id="instagram"
                    name="instagram"
                    value={userProfile.instagram}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    youtube.com/@
                  </span>
                  <input
                    type="text"
                    id="youtube"
                    name="youtube"
                    value={userProfile.youtube}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    linkedin.com/in/
                  </span>
                  <input
                    type="text"
                    id="linkedin"
                    name="linkedin"
                    value={userProfile.linkedin}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    x.com/
                  </span>
                  <input
                    type="text"
                    id="twitter"
                    name="twitter"
                    value={userProfile.twitter}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    tiktok.com/@
                  </span>
                  <input
                    type="text"
                    id="tiktok"
                    name="tiktok"
                    value={userProfile.tiktok}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="username"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.socialInput}>
                  <span className={styles.socialPrefix}>
                    <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    https://
                  </span>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    value={userProfile.website}
                    onChange={handleInputChange}
                    className={styles.socialInputField}
                    placeholder="yourwebsite.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
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
            <label htmlFor="phone" className={styles.label}>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={userProfile.phone}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter your phone number"
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className={styles.securitySection}>
            <h3 className={styles.sectionTitle}>Password & Security</h3>
            <p className={styles.sectionSubtitle}>Secure your account with password and two-factor authentication.</p>
            
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

            <div className={styles.securityItem}>
              <div className={styles.securityIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div className={styles.securityContent}>
                <h4 className={styles.securityTitle}>Two-Factor Authentication</h4>
                <p className={styles.securityDescription}>Please set a password before enabling two-factor authentication.</p>
              </div>
              <button type="button" className={styles.securityButton}>
                Enable 2FA
              </button>
            </div>

            <div className={styles.securityItem}>
              <div className={styles.securityIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/>
                  <path d="M10 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5"/>
                  <path d="M8 21l4-7 4 7"/>
                </svg>
              </div>
              <div className={styles.securityContent}>
                <h4 className={styles.securityTitle}>Passkeys</h4>
                <p className={styles.securityDescription}>Passkeys are a secure and convenient way to sign in.</p>
              </div>
              <button type="button" className={styles.securityButton}>
                Add Passkey
              </button>
            </div>
          </div>

          <div className={styles.gamingSection}>
            <h3 className={styles.sectionTitle}>Gaming Accounts</h3>
            <p className={styles.sectionSubtitle}>Link your gaming accounts to track rankings and connect with the community.</p>
            
            <div className={styles.gamingGrid}>
              <div className={styles.gamingCard}>
                <div className={styles.gamingIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className={styles.gamingContent}>
                  <h4 className={styles.gamingTitle}>EA</h4>
                  <p className={styles.gamingStatus}>
                    {gamingAccounts.ea.linked ? gamingAccounts.ea.username : 'Not Linked'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className={styles.gamingButton}
                  onClick={() => handleGamingLink('ea')}
                >
                  {gamingAccounts.ea.linked ? '✓' : '+'}
                </button>
              </div>

              <div className={styles.gamingCard}>
                <div className={styles.gamingIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className={styles.gamingContent}>
                  <h4 className={styles.gamingTitle}>Start.gg</h4>
                  <p className={styles.gamingStatus}>
                    {gamingAccounts.startgg.linked ? gamingAccounts.startgg.username : 'Not Linked'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className={styles.gamingButton}
                  onClick={() => handleGamingLink('startgg')}
                >
                  {gamingAccounts.startgg.linked ? '✓' : '+'}
                </button>
              </div>

              <div className={styles.gamingCard}>
                <div className={styles.gamingIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div className={styles.gamingContent}>
                  <h4 className={styles.gamingTitle}>Battlefy</h4>
                  <p className={styles.gamingStatus}>
                    {gamingAccounts.battlefy.linked ? gamingAccounts.battlefy.username : 'Not Linked'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className={styles.gamingButton}
                  onClick={() => handleGamingLink('battlefy')}
                >
                  {gamingAccounts.battlefy.linked ? '✓' : '+'}
                </button>
              </div>

              <div className={styles.gamingCard}>
                <div className={styles.gamingIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className={styles.gamingContent}>
                  <h4 className={styles.gamingTitle}>Smashers.gg</h4>
                  <p className={styles.gamingStatus}>
                    {gamingAccounts.smashersgg.linked ? gamingAccounts.smashersgg.username : 'Not Linked'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className={styles.gamingButton}
                  onClick={() => handleGamingLink('smashersgg')}
                >
                  {gamingAccounts.smashersgg.linked ? '✓' : '+'}
                </button>
              </div>

              <div className={styles.gamingCard}>
                <div className={styles.gamingIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className={styles.gamingContent}>
                  <h4 className={styles.gamingTitle}>Battle.net</h4>
                  <p className={styles.gamingStatus}>
                    {gamingAccounts.battlenet.linked ? gamingAccounts.battlenet.username : 'Not Linked'}
                  </p>
                </div>
                <button 
                  type="button" 
                  className={styles.gamingButton}
                  onClick={() => handleGamingLink('battlenet')}
                >
                  {gamingAccounts.battlenet.linked ? '✓' : '+'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage}>
              {success}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
