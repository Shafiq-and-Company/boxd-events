import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import PageTitle from './PageTitle'
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
    state: ''
  })
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [bannerImageUrl, setBannerImageUrl] = useState(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // Helper functions
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  // Event handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        game_title: formData.game_title,
        city: formData.city,
        state: formData.state,
        cost: formData.cost || 0
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

      // Show success feedback and refresh form data
      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
      
      // Refresh the form data to show updated values
      await fetchEventData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!user) {
      setError('You must be logged in to delete an event')
      return
    }

    setDeleteLoading(true)
    setError(null)

    try {
      // Delete RSVPs first
      const { error: rsvpError } = await supabase
        .from('rsvps')
        .delete()
        .eq('event_id', id)

      if (rsvpError) throw rsvpError

      // Delete event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('host_id', user.id)

      if (eventError) throw eventError

      router.push('/my-events?tab=hosting')
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteLoading(false)
      setShowDeleteConfirm(false)
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
        state: event.state || ''
      })

      setBannerImageUrl(event.banner_image_url || null)
    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err.message)
    } finally {
      setFetchLoading(false)
    }
  }

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('game_title')
        .order('game_title')

      if (error) throw error
      setGames(data || [])
    } catch (err) {
      console.error('Error fetching games:', err.message)
      setError('Failed to load games')
    } finally {
      setGamesLoading(false)
    }
  }

  // Effects
  useEffect(() => {
    if (id && user) fetchEventData()
  }, [id, user])

  useEffect(() => {
    fetchGames()
  }, [])


  // Early returns
  if (!user) {
    return (
      <div className={styles.manageEvent}>
        <PageTitle title="Manage Event" subtitle="Update your event details" />
        <div className={styles.authRequired}>Please log in to edit an event.</div>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <PageTitle title="Manage Event" subtitle="Update your event details" />
        <div className={styles.loading}>Loading event details...</div>
      </div>
    )
  }

  if (error && !fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <PageTitle title="Manage Event" subtitle="Update your event details" />
        <div className={styles.errorMessage}>{error}</div>
      </div>
    )
  }

  return (
    <div className={styles.manageEvent}>
      <PageTitle title="Manage Event" subtitle="Update your event details" />
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      {updateSuccess && (
        <div className={styles.successMessage}>Event updated successfully!</div>
      )}

      <div className={styles.formContainer}>
        <div className={styles.twoColumnLayout}>
          <div className={styles.bannerColumn}>
            <div className={styles.bannerImage}>
              {bannerImageUrl ? (
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
          </div>

          <div className={styles.formColumn}>
            <form onSubmit={handleSubmit} className={styles.form}>
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

              <div className={styles.gameSection}>
                {gamesLoading ? (
                  <div className={styles.gameLoading}>Loading games...</div>
                ) : (
                  <div className={styles.gameOptions}>
                    {games.map((game, index) => (
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
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? 'Updating Event...' : 'Update Event'}
              </button>

              <div className={styles.buttonSpacer}></div>
              <div className={styles.deleteDivider}></div>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={styles.deleteButton}
                disabled={loading || deleteLoading}
              >
                Delete Event
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Event</h3>
            <p className={styles.modalMessage}>
              This action cannot be undone and will remove all RSVPs.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={styles.cancelButton}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                className={styles.confirmDeleteButton}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}