import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import styles from './ManageEvent.module.css'

export default function ManageEvent() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
  // State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    game_title: '',
    city: '',
    cost: '',
    state: '',
    zip_code: '',
    theme: ''
  })
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Helper functions
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `event-banners/${fileName}`

    const { data, error } = await supabase.storage
      .from('event_banner_images')
      .upload(filePath, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('event_banner_images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      })
    }
  }

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }


  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    const fileInput = document.getElementById('bannerFile')
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to edit an event')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let bannerImageUrl = formData.banner_image_url
      
      // Upload new image if one was selected
      if (imageFile) {
        setImageUploading(true)
        bannerImageUrl = await uploadImage(imageFile)
        setImageUploading(false)
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        game_title: formData.game_title,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        cost: formData.cost || 0,
        theme: formData.theme,
        banner_image_url: bannerImageUrl
      }

      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .eq('host_id', user.id)
        .select()

      if (error) {
        console.error('Database update error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        setError('No rows were updated. You may not have permission to edit this event.')
        return
      }

      showNotification('Event Updated', 'Your event has been updated successfully!')
      await fetchEventData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Data fetching
  const fetchEventData = async () => {
    try {
      setFetchLoading(true)
      setError(null)

      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (error) throw error
      if (!event) throw new Error('Event not found or you do not have permission to edit it')

      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        starts_at: formatDateForInput(event.starts_at),
        ends_at: formatDateForInput(event.ends_at),
        game_title: event.game_title || '',
        city: event.city || '',
        cost: event.cost || '',
        state: event.state || '',
        zip_code: event.zip_code || '',
        theme: event.theme || ''
      })

      setBannerImageUrl(event.banner_image_url || null)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err.message)
    } finally {
      setFetchLoading(false)
    }
  }


  const fetchAttendees = async () => {
    if (!id) return
    
    try {
      setLoadingAttendees(true)
      
      const { data, error } = await supabase
        .from('rsvps')
        .select(`
          user_id,
          created_at,
          users:user_id (
            username,
            first_name
          )
        `)
        .eq('event_id', id)
        .eq('status', 'going')
        .order('created_at', { ascending: true })

      if (error) {
        setAttendees([])
        return
      }

      setAttendees(data || [])
    } catch (err) {
      setAttendees([])
    } finally {
      setLoadingAttendees(false)
    }
  }

  // Effects
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (id && user) fetchEventData()
  }, [id, user])


  useEffect(() => {
    if (id) {
      fetchAttendees()
    }
  }, [id])

  // Early returns
  if (!user) {
    return (
      <div className={styles.manageEvent}>
        <div className={styles.authRequired}>Please log in to edit an event.</div>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <div className={styles.loading}>Loading event details...</div>
      </div>
    )
  }

  if (error && !fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <div className={styles.errorMessage}>{error}</div>
      </div>
    )
  }

  return (
    <div className={styles.manageEvent}>
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {/* Tournament Section - Full Width at Top */}
      <div className={styles.tournamentSectionTop}>
        <div className={styles.tournamentCard}>
          <div className={styles.tournamentCardContent}>
            <div className={styles.tournamentIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21l-1.5.5c-.5.17-1.03.17-1.53 0l-1.5-.5C4.47 17.98 4 17.55 4 17v-2.34"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21l1.5.5c.5.17 1.03.17 1.53 0l1.5-.5C19.53 17.98 20 17.55 20 17v-2.34"/>
                <path d="M18 2H6l2 7h8l2-7Z"/>
                <path d="M12 9v4"/>
              </svg>
            </div>
            <div className={styles.tournamentCardText}>
              <div className={styles.tournamentCardTitle}>Tournament Brackets</div>
              <div className={styles.tournamentCardDescription}>Manage tournament structure, seed players, and track match results</div>
            </div>
            <div className={styles.tournamentCardActions}>
              <button
                type="button"
                className={styles.manageTournamentCardButton}
                onClick={() => {
                  router.push(`/manage-tournament?eventId=${id}`)
                }}
                title="Manage tournament"
              >
                Manage →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabSection}>
        <div className={styles.tabNavigation}>
          <button
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'guests' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('guests')}
          >
            Guests
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'registration' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('registration')}
          >
            Registration
          </button>
        </div>
      </div>

      <div className={styles.formContainer}>
        {activeTab === 'overview' && (
          <div className={styles.twoColumnLayout}>
            <div className={styles.bannerColumn}>
            <div className={styles.bannerImage}>
              <div className={styles.imageControls}>
                <input
                  type="file"
                  id="bannerFile"
                  name="bannerFile"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                <label htmlFor="bannerFile" className={styles.fileInputLabel}>
                  {imageFile ? 'Change Image' : 'Choose Image'}
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className={styles.removeImageButton}
                  >
                    Remove Image
                  </button>
                )}
              </div>
              
              <div className={styles.imageContainer}>
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Banner preview" 
                    className={styles.bannerPreview}
                  />
                ) : bannerImageUrl ? (
                  <img 
                    src={bannerImageUrl} 
                    alt="Event banner" 
                    className={styles.bannerPreview}
                  />
                ) : (
                  <div className={styles.bannerPlaceholder}>
                    <div className={styles.uploadText}>Upload banner image</div>
                  </div>
                )}
              </div>
              
              <div className={styles.themeDropdown}>
                <select
                  id="theme"
                  name="theme"
                  value={formData.theme}
                  onChange={handleInputChange}
                  className={styles.themeSelect}
                >
                  <option value="">Select Theme</option>
                  <option value="gaming">Gaming</option>
                  <option value="sports">Sports</option>
                  <option value="tech">Tech</option>
                  <option value="music">Music</option>
                  <option value="art">Art</option>
                  <option value="food">Food</option>
                  <option value="business">Business</option>
                  <option value="education">Education</option>
                  <option value="health">Health</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>


          </div>

          <div className={styles.formColumn}>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.eventDetailsSection}>
                <div className={styles.formGroup}>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className={styles.titleInput}
                    placeholder="Event Title"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <input
                      type="datetime-local"
                      id="starts_at"
                      name="starts_at"
                      value={formData.starts_at}
                      onChange={handleInputChange}
                      required
                      className={styles.input}
                      placeholder="Start Date & Time"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="datetime-local"
                      id="ends_at"
                      name="ends_at"
                      value={formData.ends_at}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="End Date & Time"
                    />
                  </div>
                </div>

                <div className={styles.formRowFour}>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Address"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="City"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="State"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <input
                      type="text"
                      id="zip_code"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={styles.textarea}
                    placeholder="Event Description"
                    rows="3"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || imageUploading}
                  className={styles.submitButton}
                >
                  {loading ? 'Updating Event...' : imageUploading ? 'Uploading Image...' : 'Update Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

        {activeTab === 'guests' && (
          <div className={styles.guestsTabContent}>
            
            <div className={styles.guestsStats}>
              <div className={styles.guestStat}>
                <div className={styles.guestStatNumber}>
                  {loadingAttendees ? '...' : attendees.length}
                </div>
                <div className={styles.guestStatLabel}>
                  {attendees.length === 1 ? 'Attendee' : 'Attendees'}
                </div>
              </div>
              
              <div className={styles.shareLinkStat}>
                <div className={styles.shareLinkIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className={styles.shareLinkLabel}>Share Link</div>
              </div>
            </div>

            {loadingAttendees ? (
              <div className={styles.guestsLoading}>Loading attendees...</div>
            ) : attendees.length === 0 ? (
              <div className={styles.guestsEmpty}>
                <div className={styles.guestsEmptyIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className={styles.guestsEmptyTitle}>No attendees yet</div>
                <div className={styles.guestsEmptyDescription}>
                  Share your event to start getting RSVPs
                </div>
              </div>
            ) : (
              <div className={styles.guestsList}>
                {attendees.map((attendee) => (
                  <div key={attendee.user_id} className={styles.guestItem}>
                    <div className={styles.guestAvatar}>
                      <div className={styles.guestInitial}>
                        {(attendee.users?.username?.charAt(0) || attendee.users?.first_name?.charAt(0) || 'U').toUpperCase()}
                      </div>
                    </div>
                    <div className={styles.guestInfo}>
                      <div className={styles.guestName}>
                        {attendee.users?.username || attendee.users?.first_name || 'Unknown User'}
                      </div>
                      <div className={styles.guestJoined}>
                        Joined {new Date(attendee.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'registration' && (
          <div className={styles.registrationTabContent}>
            <div className={styles.costSection}>
              <h3 className={styles.sectionTitle}>Event Cost</h3>
              <div className={styles.costInputRow}>
                <div className={styles.formGroup}>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="Event cost (e.g., 25.00)"
                    min="0"
                    step="0.01"
                  />
                </div>
                <button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className={styles.updateCostButton}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}