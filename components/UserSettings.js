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
    avatar_url: ''
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
          
          // Use retry data with proper fallbacks
          const metadata = user.user_metadata || {}
          const emailName = user.email?.split('@')[0] || ''
          const emailParts = emailName.split('.')
          const fallbackFirstName = emailParts[0] || ''
          const fallbackLastName = emailParts[1] || ''

          setUserProfile({
            first_name: retryProfile.first_name || metadata.first_name || fallbackFirstName,
            last_name: retryProfile.last_name || metadata.last_name || fallbackLastName,
            email: retryProfile.email || user.email || '',
            phone: retryProfile.phone || metadata.phone || '',
            username: retryProfile.username || metadata.username || user.email?.split('@')[0] || '',
            biography: retryProfile.biography || metadata.biography || '',
            avatar_url: metadata.avatar_url || '',
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
        first_name: profile.first_name || metadata.first_name || fallbackFirstName,
        last_name: profile.last_name || metadata.last_name || fallbackLastName,
        email: profile.email || user.email || '',
        phone: profile.phone || metadata.phone || '',
        username: profile.username || metadata.username || user.email?.split('@')[0] || '',
        biography: profile.biography || metadata.biography || '',
        avatar_url: metadata.avatar_url || '',
      })
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('Failed to load your profile information. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setUserProfile(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing in any field
    if (error) {
      setError('')
    }
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

  // Validate first name input
  const validateFirstName = (firstName) => {
    if (!firstName || firstName.trim().length === 0) {
      return 'First name is required'
    }
    if (firstName.trim().length < 2) {
      return 'First name must be at least 2 characters'
    }
    if (firstName.trim().length > 50) {
      return 'First name must be less than 50 characters'
    }
    if (!/^[\p{L}\s\-'\.]+$/u.test(firstName.trim())) {
      return 'First name can only contain letters, spaces, hyphens, apostrophes, and periods'
    }
    return null
  }

  // Validate last name input
  const validateLastName = (lastName) => {
    if (!lastName || lastName.trim().length === 0) {
      return 'Last name is required'
    }
    if (lastName.trim().length < 2) {
      return 'Last name must be at least 2 characters'
    }
    if (lastName.trim().length > 50) {
      return 'Last name must be less than 50 characters'
    }
    if (!/^[\p{L}\s\-'\.]+$/u.test(lastName.trim())) {
      return 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods'
    }
    return null
  }

  // Validate username input
  const validateUsername = (username) => {
    if (!username || username.trim().length === 0) {
      return 'Username is required'
    }
    if (username.trim().length < 3) {
      return 'Username must be at least 3 characters'
    }
    if (username.trim().length > 30) {
      return 'Username must be less than 30 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    return null
  }

  // Validate biography input
  const validateBiography = (biography) => {
    if (biography && biography.trim().length > 500) {
      return 'Bio must be less than 500 characters'
    }
    return null
  }

  // Validate phone input
  const validatePhone = (phone) => {
    if (phone && phone.trim().length > 0) {
      // Remove all non-digit characters for validation
      const digitsOnly = phone.replace(/\D/g, '')
      if (digitsOnly.length < 10) {
        return 'Phone number must have at least 10 digits'
      }
      if (digitsOnly.length > 15) {
        return 'Phone number must have no more than 15 digits'
      }
    }
    return null
  }


  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Validate all fields
      const firstNameError = validateFirstName(userProfile.first_name)
      if (firstNameError) {
        setError(firstNameError)
        return
      }

      const lastNameError = validateLastName(userProfile.last_name)
      if (lastNameError) {
        setError(lastNameError)
        return
      }

      const usernameError = validateUsername(userProfile.username)
      if (usernameError) {
        setError(usernameError)
        return
      }

      const biographyError = validateBiography(userProfile.biography)
      if (biographyError) {
        setError(biographyError)
        return
      }

      const phoneError = validatePhone(userProfile.phone)
      if (phoneError) {
        setError(phoneError)
        return
      }


      // Update user metadata first (this is the source of truth)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: userProfile.first_name.trim(),
          last_name: userProfile.last_name.trim(),
          username: userProfile.username.trim(),
          biography: userProfile.biography.trim(),
          phone: userProfile.phone.trim(),
          avatar_url: userProfile.avatar_url
        }
      })
      
      if (metadataError) {
        console.error('Auth metadata update error:', metadataError)
        throw new Error(`Failed to update profile: ${metadataError.message}`)
      }

      // The database trigger will automatically sync the users table
      // Wait a moment for the trigger to complete, then refresh the profile
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchUserProfile()

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Profile update error:', err)
      setError(err.message || 'Failed to update your profile. Please try again.')
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
                className={`${styles.input} ${userProfile.first_name && validateFirstName(userProfile.first_name) ? styles.inputError : ''}`}
                placeholder="Enter your first name"
                required
              />
              {userProfile.first_name && validateFirstName(userProfile.first_name) && (
                <div className={styles.fieldError}>
                  {validateFirstName(userProfile.first_name)}
                </div>
              )}
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
                className={`${styles.input} ${userProfile.last_name && validateLastName(userProfile.last_name) ? styles.inputError : ''}`}
                placeholder="Enter your last name"
                required
              />
              {userProfile.last_name && validateLastName(userProfile.last_name) && (
                <div className={styles.fieldError}>
                  {validateLastName(userProfile.last_name)}
                </div>
              )}
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
                className={`${styles.input} ${userProfile.username && validateUsername(userProfile.username) ? styles.inputError : ''}`}
                placeholder="Enter your username"
                required
              />
            </div>
            {userProfile.username && validateUsername(userProfile.username) && (
              <div className={styles.fieldError}>
                {validateUsername(userProfile.username)}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className={styles.formGroup}>
            <label htmlFor="biography" className={styles.label}>
              Bio
              <span className={styles.characterCount}>
                {userProfile.biography.length}/500
              </span>
            </label>
            <textarea
              id="biography"
              name="biography"
              value={userProfile.biography}
              onChange={handleInputChange}
              className={`${styles.textarea} ${userProfile.biography && validateBiography(userProfile.biography) ? styles.inputError : ''}`}
              placeholder="Tell us about yourself..."
              rows={2}
            />
            {userProfile.biography && validateBiography(userProfile.biography) && (
              <div className={styles.fieldError}>
                {validateBiography(userProfile.biography)}
              </div>
            )}
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
              className={`${styles.input} ${userProfile.phone && validatePhone(userProfile.phone) ? styles.inputError : ''}`}
              placeholder="Enter your phone number"
            />
            {userProfile.phone && validatePhone(userProfile.phone) && (
              <div className={styles.fieldError}>
                {validatePhone(userProfile.phone)}
              </div>
            )}
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