import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import PageTitle from './PageTitle'
import styles from './CreateEvent.module.css'

export default function CreateEvent() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    game_title: '',
    city: '',
    state: '',
    zip_code: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Fetch games from the games table
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('game_title')
          .order('game_title')

        if (error) {
          throw error
        }

        setGames(data || [])
      } catch (err) {
        console.error('Error fetching games:', err.message)
        setError('Failed to load games')
      } finally {
        setGamesLoading(false)
      }
    }

    fetchGames()
  }, [])

  // Filter games based on search term
  const filteredGames = games.filter(game => 
    game.game_title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
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
      // Prepare event data with only the fields that should be saved
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
        host_id: user.id
      }

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()

      if (error) {
        throw error
      }

      setSuccess(true)
      setFormData({
        title: '',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        game_title: '',
        city: '',
        state: '',
        zip_code: ''
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className={styles.createEvent}>
        <PageTitle title="Create Event" subtitle="Host your own gaming event" />
        <div className={styles.authRequired}>
          Please log in to create an event.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.createEvent}>
      <PageTitle title="Create Event" subtitle="Host your own gaming event" />
      
      {success && (
        <div className={styles.successMessage}>
          Event created successfully!
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.bannerSection}>
          <div className={styles.bannerImage}>
            <div className={styles.bannerPlaceholder}>
              <div className={styles.uploadText}>Upload banner image</div>
            </div>
          </div>
        </div>

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

        <div className={styles.dateTimeSection}>
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
        </div>

        <div className={styles.gameSection}>
          {gamesLoading ? (
            <div className={styles.gameLoading}>Loading games...</div>
          ) : (
            <>
              <div className={styles.gameSearchContainer}>
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={styles.gameSearchInput}
                />
              </div>
              
              <div className={styles.gameOptions}>
                {filteredGames.map((game, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.gameOption} ${formData.game_title === game.game_title ? styles.gameOptionSelected : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, game_title: game.game_title }))}
                  >
                    <div className={styles.gameImage}>
                      <div className={styles.imagePlaceholder}>
                        {game.game_title.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <span className={styles.gameLabel}>{game.game_title}</span>
                  </button>
                ))}
              </div>

              {filteredGames.length === 0 && searchTerm && (
                <div className={styles.noGamesFound}>
                  No games found matching "{searchTerm}"
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.descriptionSection}>
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
        </div>

        <div className={styles.locationSection}>
          <div className={styles.formRowThree}>
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
                id="zip_code"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Zip Code"
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
          </div>
        </div>


        <button 
          type="submit" 
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? 'Creating Event...' : 'Create Event'}
        </button>
        </form>
      </div>
    </div>
  )
}
