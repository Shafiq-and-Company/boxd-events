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
  const [currentTheme, setCurrentTheme] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [tournament, setTournament] = useState(null)
  const [tournamentLoading, setTournamentLoading] = useState(false)

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

  const handleThemeChange = async (e) => {
    const { value } = e.target
    setFormData(prev => ({
      ...prev,
      theme: value
    }))

    // Create theme object based on selected theme
    let themeObject = null
    if (value === 'blue') {
      themeObject = {
        name: 'blue',
        colors: {
          background: '#f0f8ff',
          primary: '#000000',
          secondary: '#e6f3ff',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'red') {
      themeObject = {
        name: 'red',
        colors: {
          background: '#fff0f0',
          primary: '#000000',
          secondary: '#ffe6e6',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'green') {
      themeObject = {
        name: 'green',
        colors: {
          background: '#f0fff0',
          primary: '#000000',
          secondary: '#e6ffe6',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'yellow') {
      themeObject = {
        name: 'yellow',
        colors: {
          background: '#fffef0',
          primary: '#000000',
          secondary: '#fffce6',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'purple') {
      themeObject = {
        name: 'purple',
        colors: {
          background: '#f8f0ff',
          primary: '#000000',
          secondary: '#f0e6ff',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'orange') {
      themeObject = {
        name: 'orange',
        colors: {
          background: '#fff8f0',
          primary: '#000000',
          secondary: '#ffe6cc',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    } else if (value === 'pink') {
      themeObject = {
        name: 'pink',
        colors: {
          background: '#fff0f8',
          primary: '#000000',
          secondary: '#ffe6f3',
          accent: '#333333',
          text: '#000000',
          textSecondary: '#666666',
          border: '#000000'
        }
      }
    }

    // Update current theme state immediately
    setCurrentTheme(themeObject)

    // Save to Supabase
    try {
      const { error } = await supabase
        .from('events')
        .update({ theme: themeObject })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.error('Error updating theme:', err)
      setError('Failed to update theme')
    }
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

      // Theme is now handled separately in handleThemeChange
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

      // Extract theme name from theme object
      let themeName = ''
      if (event.theme && typeof event.theme === 'object' && event.theme.name) {
        themeName = event.theme.name
        setCurrentTheme(event.theme) // Store full theme object
      } else if (typeof event.theme === 'string') {
        themeName = event.theme
        setCurrentTheme(null) // No theme object available
      } else {
        setCurrentTheme(null)
      }

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
        theme: themeName
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
      loadTournament()
    }
  }, [id])

  // Load tournament data
  const loadTournament = async () => {
    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading tournament:', error);
        return;
      }

      setTournament(tournamentData || null);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setTournament(null);
    }
  }

  // Create tournament
  const createTournament = async () => {
    if (!formData.title) {
      setError('Event title is required to create a tournament');
      return;
    }

    setTournamentLoading(true);
    setError(null);

    try {
      const tournamentData = {
        event_id: id,
        name: formData.title,
        description: formData.description || 'Tournament for ' + formData.title,
        max_participants: 64,
        min_participants: 2,
        status: 'registration',
        tournament_type: 'single_elimination',
        rules: 'Standard tournament rules apply. Check with event host for specific details.',
        bracket_data: {}
      }

      const { data: newTournament, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setTournament(newTournament);
      
      // Navigate to tournament management page
      router.push(`/manage-tournament/${newTournament.id}`);
    } catch (error) {
      console.error('Error creating tournament:', error);
      setError('Failed to create tournament: ' + error.message);
    } finally {
      setTournamentLoading(false);
    }
  }

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

  // Apply theme background
  const pageStyle = currentTheme ? {
    background: currentTheme.colors.background,
    minHeight: '100vh'
  } : {}

  return (
    <div className={styles.manageEvent} style={pageStyle}>
      
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
              {tournament ? (
                <button
                  type="button"
                  className={styles.manageTournamentCardButton}
                  onClick={async () => {
                    try {
                      router.push(`/manage-tournament/${tournament.id}`);
                    } catch (error) {
                      console.error('Error navigating to tournament:', error);
                    }
                  }}
                  title="Manage tournament"
                >
                  Manage →
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.createTournamentCardButton}
                  onClick={createTournament}
                  disabled={tournamentLoading || !formData.title}
                  title="Create tournament"
                >
                  {tournamentLoading ? 'Creating...' : 'Create Tournament'}
                </button>
              )}
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
              
              <div className={styles.themeSelector}>
                <div className={styles.themeLabel}>Choose Theme</div>
                <div className={styles.themeOptions}>
                  <button
                    className={`${styles.themeOption} ${formData.theme === '' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: '' } })}
                    style={{ background: '#ffffff', border: '2px solid #000' }}
                    title="Default"
                  >
                    <div className={styles.themeOptionName}>Default</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'blue' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'blue' } })}
                    style={{ background: '#f0f8ff', border: '2px solid #000' }}
                    title="Blue"
                  >
                    <div className={styles.themeOptionName}>Blue</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'red' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'red' } })}
                    style={{ background: '#fff0f0', border: '2px solid #000' }}
                    title="Red"
                  >
                    <div className={styles.themeOptionName}>Red</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'green' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'green' } })}
                    style={{ background: '#f0fff0', border: '2px solid #000' }}
                    title="Green"
                  >
                    <div className={styles.themeOptionName}>Green</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'yellow' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'yellow' } })}
                    style={{ background: '#fffef0', border: '2px solid #000' }}
                    title="Yellow"
                  >
                    <div className={styles.themeOptionName}>Yellow</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'purple' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'purple' } })}
                    style={{ background: '#f8f0ff', border: '2px solid #000' }}
                    title="Purple"
                  >
                    <div className={styles.themeOptionName}>Purple</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'orange' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'orange' } })}
                    style={{ background: '#fff8f0', border: '2px solid #000' }}
                    title="Orange"
                  >
                    <div className={styles.themeOptionName}>Orange</div>
                  </button>
                  
                  <button
                    className={`${styles.themeOption} ${formData.theme === 'pink' ? styles.themeOptionActive : ''}`}
                    onClick={() => handleThemeChange({ target: { value: 'pink' } })}
                    style={{ background: '#fff0f8', border: '2px solid #000' }}
                    title="Pink"
                  >
                    <div className={styles.themeOptionName}>Pink</div>
                  </button>
                </div>
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