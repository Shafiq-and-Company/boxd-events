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
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [userProfile, setUserProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    biography: '',
    avatar_url: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    twitter: '',
    tiktok: '',
    website: ''
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
      const { data: existingUser, error: checkError } = await supabase
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
            username: user.user_metadata?.username || user.email?.split('@')[0] || '',
            biography: user.user_metadata?.biography || '',
            phone: user.user_metadata?.phone || '',
            instagram: user.user_metadata?.instagram || '',
            youtube: user.user_metadata?.youtube || '',
            linkedin: user.user_metadata?.linkedin || '',
            twitter: user.user_metadata?.twitter || '',
            tiktok: user.user_metadata?.tiktok || '',
            website: user.user_metadata?.website || ''
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
      setError('')

      // Ensure user record exists first
      await ensureUserRecord()

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('first_name, last_name, email, username, biography, phone, instagram, youtube, linkedin, twitter, tiktok, website')
        .eq('id', user.id)
        .single()

      if (profileError) {
        // If user record doesn't exist, try to create it and fetch again
        if (profileError.code === 'PGRST116') {
          await ensureUserRecord()
          // Try fetching again after creating the record
          const { data: retryProfile, error: retryError } = await supabase
            .from('users')
            .select('first_name, last_name, email, username, biography, phone, instagram, youtube, linkedin, twitter, tiktok, website')
            .eq('id', user.id)
            .single()
          
          if (retryError) {
            throw retryError
          }
          
          // Use retry data
          const metadata = user.user_metadata || {}
          const emailName = user.email?.split('@')[0] || ''
          const emailParts = emailName.split('.')
          const fallbackFirstName = emailParts[0] || ''
          const fallbackLastName = emailParts[1] || ''

          setUserProfile({
            first_name: retryProfile.first_name || fallbackFirstName,
            last_name: retryProfile.last_name || fallbackLastName,
            email: retryProfile.email || user.email || '',
            phone: retryProfile.phone || '',
            username: retryProfile.username || user.email?.split('@')[0] || '',
            biography: retryProfile.biography || '',
            avatar_url: metadata.avatar_url || '',
            instagram: retryProfile.instagram || '',
            youtube: retryProfile.youtube || '',
            linkedin: retryProfile.linkedin || '',
            twitter: retryProfile.twitter || '',
            tiktok: retryProfile.tiktok || '',
            website: retryProfile.website || ''
          })
          return
        }
        throw profileError
      }

      // Get avatar_url from user metadata (not stored in users table)
      const metadata = user.user_metadata || {}
      const emailName = user.email?.split('@')[0] || ''
      const emailParts = emailName.split('.')
      const fallbackFirstName = emailParts[0] || ''
      const fallbackLastName = emailParts[1] || ''

      setUserProfile({
        first_name: profile.first_name || fallbackFirstName,
        last_name: profile.last_name || fallbackLastName,
        email: profile.email || user.email || '',
        phone: profile.phone || '',
        username: profile.username || user.email?.split('@')[0] || '',
        biography: profile.biography || '',
        avatar_url: metadata.avatar_url || '',
        instagram: profile.instagram || '',
        youtube: profile.youtube || '',
        linkedin: profile.linkedin || '',
        twitter: profile.twitter || '',
        tiktok: profile.tiktok || '',
        website: profile.website || ''
      })
    } catch (err) {
      setError('Failed to load your profile information. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setUserProfile(prev => ({ ...prev, [name]: value }))
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      setError('')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setUserProfile(prev => ({ ...prev, avatar_url: data.publicUrl }))
      setSuccess('Profile picture updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // First, try to update the users table
      const updateData = {
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        username: userProfile.username,
        biography: userProfile.biography,
        phone: userProfile.phone,
        instagram: userProfile.instagram,
        youtube: userProfile.youtube,
        linkedin: userProfile.linkedin,
        twitter: userProfile.twitter,
        tiktok: userProfile.tiktok,
        website: userProfile.website
      }

      // Ensure user record exists before updating
      await ensureUserRecord()
      
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()

      if (updateError) {
        // If database update fails, try to update user metadata as fallback
        
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            username: userProfile.username,
            biography: userProfile.biography,
            phone: userProfile.phone,
            instagram: userProfile.instagram,
            youtube: userProfile.youtube,
            linkedin: userProfile.linkedin,
            twitter: userProfile.twitter,
            tiktok: userProfile.tiktok,
            website: userProfile.website,
            avatar_url: userProfile.avatar_url
          }
        })
        
        if (metadataError) {
          throw metadataError
        }
      } else {
        // Update user metadata for avatar_url (not stored in users table)
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            avatar_url: userProfile.avatar_url
          }
        })

        if (metadataError) {
          // Don't throw here, as the main profile was saved
        }
        
        // Force refresh the profile data to ensure UI shows updated values
        setTimeout(async () => {
          await fetchUserProfile()
        }, 100)
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to update your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Helper function to get avatar initial
  const getAvatarInitial = () => {
    if (userProfile.first_name) return userProfile.first_name.charAt(0).toUpperCase()
    if (userProfile.email) return userProfile.email.charAt(0).toUpperCase()
    return 'U'
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

  // Social media configuration
  const socialPlatforms = [
    {
      id: 'instagram',
      prefix: 'instagram.com/',
      icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z'
    },
    {
      id: 'youtube',
      prefix: 'youtube.com/@',
      icon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'
    },
    {
      id: 'linkedin',
      prefix: 'linkedin.com/in/',
      icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'
    },
    {
      id: 'twitter',
      prefix: 'x.com/',
      icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
    },
    {
      id: 'tiktok',
      prefix: 'tiktok.com/@',
      icon: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z'
    },
    {
      id: 'website',
      prefix: 'https://',
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
    }
  ]

  return (
    <div className={styles.userSettings}>
      <h2>User Settings</h2>
      <p className={styles.pageSubtitle}>Manage your account information and preferences</p>
      
      {/* Profile Picture */}
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
                {getAvatarInitial()}
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
      
      {/* Settings Form */}
      <div className={styles.settingsForm}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name Fields */}
          <div className={styles.nameFields}>
            <div className={styles.formGroup}>
              <label htmlFor="first_name" className={styles.label}>First Name</label>
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
              <label htmlFor="last_name" className={styles.label}>Last Name</label>
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

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Username</label>
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

          {/* Bio */}
          <div className={styles.formGroup}>
            <label htmlFor="biography" className={styles.label}>Bio</label>
            <textarea
              id="biography"
              name="biography"
              value={userProfile.biography}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Tell us about yourself..."
              rows={2}
            />
          </div>

          {/* Social Links */}
          <div className={styles.socialSection}>
            <h3 className={styles.sectionTitle}>Social links</h3>
            <p className={styles.sectionSubtitle}>Connect your social media accounts to share your events and connect with other users.</p>
            <div className={styles.socialGrid}>
              {socialPlatforms.map(platform => (
                <div key={platform.id} className={styles.formGroup}>
                  <div className={styles.socialInput}>
                    <span className={styles.socialPrefix}>
                      <svg className={styles.socialIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d={platform.icon}/>
                      </svg>
                      {platform.prefix}
                    </span>
                    <input
                      type="text"
                      id={platform.id}
                      name={platform.id}
                      value={userProfile[platform.id]}
                      onChange={handleInputChange}
                      className={styles.socialInputField}
                      placeholder={platform.id === 'website' ? 'yourwebsite.com' : 'username'}
                    />
                  </div>
                </div>
              ))}
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

          {/* Payments Section */}
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

          {/* Security Section */}
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

          {/* Messages */}
          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}
          {success && (
            <div className={styles.successMessage}>{success}</div>
          )}
        </form>
      </div>
    </div>
  )
}