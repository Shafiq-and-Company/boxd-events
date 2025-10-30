import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import ThemeSelector from '../../components/ThemeSelector'
import TournamentSection from './TournamentSection'
import ManageGuests from './ManageGuests'
import ManageRegistration from './ManageRegistration'
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
    game_id: '',
    city: '',
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
  const [currentTheme, setCurrentTheme] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [gameBackgroundImage, setGameBackgroundImage] = useState(null)
  const [games, setGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [gameSelectionEnabled, setGameSelectionEnabled] = useState(false)
  const containerRef = useRef(null)

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

    if (name === 'game_id') {
      const selectedGame = value ? games.find(game => String(game.id) === String(value)) : null
      setGameBackgroundImage(selectedGame?.game_background_image_url || null)
    }
  }

  const handleGameToggle = (e) => {
    const enabled = e.target.checked
    setGameSelectionEnabled(enabled)
    
    if (!enabled) {
      setFormData(prev => ({ ...prev, game_id: '' }))
      setGameBackgroundImage(null)
    }
  }

  const handleThemeChange = async (themeObject) => {
    setCurrentTheme(themeObject)
    
    setFormData(prev => ({
      ...prev,
      theme: themeObject?.name || ''
    }))

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
        game_id: gameSelectionEnabled && formData.game_id ? formData.game_id : null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
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
        .select(`
          *,
          games (id, game_title, game_background_image_url)
        `)
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (error) throw error
      if (!event) throw new Error('Event not found or you do not have permission to edit it')

      // Set game background image and game selection if available
      if (event.game_id) {
        setGameSelectionEnabled(true)
        if (event.games && event.games.game_background_image_url) {
          setGameBackgroundImage(event.games.game_background_image_url)
        } else {
          setGameBackgroundImage(null)
        }
      } else {
        setGameBackgroundImage(null)
        setGameSelectionEnabled(false)
      }

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
        game_id: event.game_id || '',
        city: event.city || '',
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


  // Effects
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoadingGames(true)
        const { data, error } = await supabase
          .from('games')
          .select('id, game_title, game_background_image_url')
          .order('game_title', { ascending: true })

        if (error) {
          console.error('Error fetching games:', error)
          setError('Failed to load games')
        } else {
          setGames(data || [])
        }
      } catch (err) {
        console.error('Error fetching games:', err)
        setError('Failed to load games')
      } finally {
        setLoadingGames(false)
      }
    }

    if (user) {
      fetchGames()
    }
  }, [user])

  useEffect(() => {
    if (formData.game_id && games.length > 0) {
      const selectedGame = games.find(game => String(game.id) === String(formData.game_id))
      if (selectedGame?.game_background_image_url) {
        setGameBackgroundImage(selectedGame.game_background_image_url)
      }
    }
  }, [games, formData.game_id])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    if (currentTheme) {
      const hex = currentTheme.colors.background
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const overlayColor = `rgba(${r}, ${g}, ${b}, 0.8)`
      containerRef.current.style.setProperty('--theme-overlay-color', overlayColor)
    } else {
      containerRef.current.style.setProperty('--theme-overlay-color', 'rgba(255, 255, 255, 0.95)')
    }
  }, [currentTheme])

  useEffect(() => {
    if (id && user) fetchEventData()
  }, [id, user])

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

  const pageStyle = gameBackgroundImage ? {
    backgroundImage: `url(${gameBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {}

  return (
    <div ref={containerRef} className={styles.manageEvent} style={pageStyle}>
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <TournamentSection 
        eventId={id} 
        eventTitle={formData.title}
        eventDescription={formData.description}
        onError={setError}
      />

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
                
                <ThemeSelector value={currentTheme} onChange={handleThemeChange} />
              </div>
            </div>

            <div className={styles.formColumn}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <h2 className={styles.sectionTitle}>Basic Information</h2>

                <div className={styles.formGroup}>
                  <label htmlFor="title" className={styles.fieldLabel}>Event Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className={styles.titleInput}
                    placeholder="Smash Tournament"
                  />
                </div>

                <div className={styles.dateTimeSection}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="starts_at" className={styles.fieldLabel}>Start Date & Time</label>
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
                      <label htmlFor="ends_at" className={styles.fieldLabel}>End Date & Time</label>
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
                </div>

                <div className={styles.descriptionSection}>
                  <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.fieldLabel}>Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className={styles.textarea}
                      placeholder="Super Smash Bros Ultimate tournament with bracket matches and prizes. All skill levels welcome!"
                      rows="3"
                    />
                  </div>
                </div>

                <div className={styles.locationSection}>
                  <label className={styles.fieldLabel}>Location</label>
                  <div className={styles.combinedLocationField}>
                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className={styles.locationInput}
                        placeholder="Address"
                      />
                    </div>

                    <div className={styles.locationDivider}></div>

                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        id="zip_code"
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleInputChange}
                        className={styles.locationInput}
                        placeholder="Zip Code"
                      />
                    </div>

                    <div className={styles.locationDivider}></div>

                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={styles.locationInput}
                        placeholder="City"
                      />
                    </div>

                    <div className={styles.locationDivider}></div>

                    <div className={styles.formGroup}>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={styles.locationInput}
                        placeholder="State"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.gameSection}>
                  <label className={styles.fieldLabel}>Game</label>
                  <div className={styles.gameToggleContainer}>
                    <label htmlFor="game_toggle" className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        id="game_toggle"
                        checked={gameSelectionEnabled}
                        onChange={handleGameToggle}
                        className={styles.toggleSwitch}
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                    <select
                      id="game_id"
                      name="game_id"
                      value={formData.game_id}
                      onChange={handleInputChange}
                      className={styles.select}
                      disabled={!gameSelectionEnabled || loadingGames}
                    >
                      <option value="">Select a game</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.game_title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || imageUploading}
                  className={styles.submitButton}
                >
                  {loading ? 'Updating Event...' : imageUploading ? 'Uploading Image...' : 'Update Event'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'guests' && (
          <ManageGuests />
        )}

        {activeTab === 'registration' && (
          <ManageRegistration />
        )}
      </div>
    </div>
  )
}