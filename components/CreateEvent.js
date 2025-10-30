import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import styles from './CreateEvent.module.css'

export default function CreateEvent() {
  const { user } = useAuth()
  const router = useRouter()
  // Get today's date in the format required for datetime-local input
  const getTodayDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: getTodayDateTime(),
    ends_at: getTodayDateTime(),
    city: '',
    state: '',
    zip_code: '',
    game_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [games, setGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [gameBackgroundImage, setGameBackgroundImage] = useState(null)
  const [gameSelectionEnabled, setGameSelectionEnabled] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(null)
  const containerRef = useRef(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Update background image when game is selected
    if (name === 'game_id') {
      if (value === '') {
        setGameBackgroundImage(null)
      } else {
        const selectedGame = games.find(game => String(game.id) === String(value))
        setGameBackgroundImage(selectedGame?.game_background_image_url || null)
      }
    }
  }

  const handleGameToggle = (e) => {
    const enabled = e.target.checked
    setGameSelectionEnabled(enabled)
    
    // Clear game selection and background when disabled
    if (!enabled) {
      setFormData(prev => ({
        ...prev,
        game_id: ''
      }))
      setGameBackgroundImage(null)
    }
  }

  const handleThemeChange = (e) => {
    const { value } = e.target
    
    // If empty value, clear theme
    if (value === '') {
      setCurrentTheme(null)
      return
    }
    
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

    // Update current theme state
    setCurrentTheme(themeObject)
  }

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

  // Update CSS variable for theme overlay when theme or background changes
  useEffect(() => {
    if (containerRef.current) {
      if (currentTheme) {
        const hex = currentTheme.colors.background
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        const overlayColor = `rgba(${r}, ${g}, ${b}, 0.8)`
        containerRef.current.style.setProperty('--theme-overlay-color', overlayColor)
      } else {
        // Default white overlay when no theme selected
        containerRef.current.style.setProperty('--theme-overlay-color', 'rgba(255, 255, 255, 0.95)')
      }
    }
  }, [gameBackgroundImage, currentTheme])



  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      
      setBannerFile(file)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setBannerPreview(previewUrl)
    }
  }

  const uploadBannerImage = async () => {
    if (!bannerFile) return null
    
    try {
      setUploading(true)
      
      // Generate unique filename
      const fileExt = bannerFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('event_banner_images')
        .upload(fileName, bannerFile)
      
      if (error) {
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('event_banner_images')
        .getPublicUrl(data.path)
      
      return urlData.publicUrl
    } catch (err) {
      console.error('Error uploading banner image:', err.message)
      setError('Failed to upload banner image')
      throw err
    } finally {
      setUploading(false)
    }
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create an event')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload banner image if provided
      let bannerImageUrl = null
      if (bannerFile) {
        bannerImageUrl = await uploadBannerImage()
      }

      // Prepare event data with only the fields that should be saved
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        host_id: user.id,
        banner_image_url: bannerImageUrl,
        game_id: gameSelectionEnabled && formData.game_id ? formData.game_id : null,
        theme: currentTheme
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()

      if (error) {
        throw error
      }

      // Create tournament for the event
      const tournamentData = {
        event_id: data[0].id,
        name: formData.title,
        description: formData.description,
        max_participants: 64,
        min_participants: 2,
        status: 'active', // Set to active so bracket is immediately generated
        tournament_type: 'single_elimination',
        rules: 'Standard tournament rules apply. Check with event host for specific details.',
        bracket_data: {}
      }

      const { data: tournamentResult, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()

      if (tournamentError) {
        console.error('Error creating tournament:', tournamentError)
        // Don't throw error here - event was created successfully
      } else if (tournamentResult && tournamentResult[0]) {
        // Import tournament manager to generate the bracket
        const tournamentManager = (await import('../lib/tournamentManager')).default;
        
        // Generate the tournament bracket immediately (if enough participants)
        const bracketResult = await tournamentManager.createTournament(tournamentResult[0].id, formData.title);
        
        if (bracketResult) {
          console.log('Tournament bracket generated successfully');
        } else {
          console.log('Tournament created but waiting for more participants');
        }
      }

      // Show success popup and navigate to manage event page
      setTimeout(() => {
        alert('Event and tournament created successfully!')
        router.push(`/manage-event/${data[0].id}`)
      }, 1000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className={styles.createEvent}>
        <div className={styles.authRequired}>
          Please log in to create an event.
        </div>
      </div>
    )
  }

  // Apply game background image with theme overlay
  const pageStyle = gameBackgroundImage ? {
    backgroundImage: `url(${gameBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {}

  return (
    <div 
      ref={containerRef}
      className={styles.createEvent}
      style={pageStyle}
    >
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.formContainer}>
        <div className={styles.twoColumnLayout}>
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
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.game_title}
                </option>
              ))}
            </select>
          </div>
        </div>

            <button 
              type="submit" 
              disabled={loading || uploading}
              className={styles.submitButton}
            >
              {uploading ? 'Uploading Image...' : loading ? 'Creating Event...' : 'Create Event'}
            </button>
            </form>
          </div>

          <div className={styles.bannerColumn}>
            <div className={styles.bannerImage}>
              {bannerPreview ? (
                <img 
                  src={bannerPreview} 
                  alt="Banner preview" 
                  className={styles.bannerPreview}
                />
              ) : (
                <div className={styles.bannerPlaceholder}>
                  <div className={styles.uploadText}>Upload banner image</div>
                </div>
              )}
              <input
                type="file"
                id="bannerFile"
                name="bannerFile"
                accept="image/*"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <label htmlFor="bannerFile" className={styles.fileInputLabel}>
                {bannerFile ? 'Change Image' : 'Choose Image'}
              </label>
              {bannerFile && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerFile(null)
                    setBannerPreview(null)
                    // Reset file input
                    const fileInput = document.getElementById('bannerFile')
                    if (fileInput) fileInput.value = ''
                  }}
                  className={styles.removeImageButton}
                >
                  Remove Image
                </button>
              )}
            </div>

            <div className={styles.themeSelector}>
              <div className={styles.themeLabel}>Choose Theme</div>
              <div className={styles.themeOptions}>
                <button
                  type="button"
                  className={`${styles.themeOption} ${!currentTheme ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: '' } })}
                  style={{ background: '#ffffff', border: '2px solid #000' }}
                  title="Default"
                >
                  <div className={styles.themeOptionName}>Default</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'blue' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'blue' } })}
                  style={{ background: '#f0f8ff', border: '2px solid #000' }}
                  title="Blue"
                >
                  <div className={styles.themeOptionName}>Blue</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'red' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'red' } })}
                  style={{ background: '#fff0f0', border: '2px solid #000' }}
                  title="Red"
                >
                  <div className={styles.themeOptionName}>Red</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'green' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'green' } })}
                  style={{ background: '#f0fff0', border: '2px solid #000' }}
                  title="Green"
                >
                  <div className={styles.themeOptionName}>Green</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'yellow' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'yellow' } })}
                  style={{ background: '#fffef0', border: '2px solid #000' }}
                  title="Yellow"
                >
                  <div className={styles.themeOptionName}>Yellow</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'purple' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'purple' } })}
                  style={{ background: '#f8f0ff', border: '2px solid #000' }}
                  title="Purple"
                >
                  <div className={styles.themeOptionName}>Purple</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'orange' ? styles.themeOptionActive : ''}`}
                  onClick={() => handleThemeChange({ target: { value: 'orange' } })}
                  style={{ background: '#fff8f0', border: '2px solid #000' }}
                  title="Orange"
                >
                  <div className={styles.themeOptionName}>Orange</div>
                </button>
                
                <button
                  type="button"
                  className={`${styles.themeOption} ${currentTheme?.name === 'pink' ? styles.themeOptionActive : ''}`}
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
      </div>
    </div>
  )
}
