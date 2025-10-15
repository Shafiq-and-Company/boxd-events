import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import styles from './ManageEvent.module.css'

export default function ManageEvent() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
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
    capacity_enabled: false,
    capacity_min: '',
    capacity_max: '',
    recurring_enabled: false,
    recurring_frequency: 'weekly',
    recurring_end_date: '',
    recurring_days: []
  })
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Fetch event data when component mounts or id changes
  useEffect(() => {
    if (id && user) {
      fetchEventData()
    }
  }, [id, user])

  const fetchEventData = async () => {
    try {
      setFetchLoading(true)
      setError(null)

      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('host_id', user.id) // Ensure user owns this event
        .single()

      if (fetchError) {
        throw fetchError
      }

      if (!event) {
        throw new Error('Event not found or you do not have permission to edit it')
      }

      // Format dates for datetime-local inputs
      const formatDateForInput = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toISOString().slice(0, 16)
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
        capacity_enabled: false, // These fields don't exist in current schema
        capacity_min: '',
        capacity_max: '',
        recurring_enabled: false,
        recurring_frequency: 'weekly',
        recurring_end_date: '',
        recurring_days: []
      })

    } catch (err) {
      console.error('Error fetching event:', err)
      setError(err.message)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day]
    }))
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
      // Prepare event data for update
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
        .eq('host_id', user.id) // Ensure user owns this event

      if (error) {
        throw error
      }

      setSuccess(true)

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

  const handleCancel = () => {
    router.push('/?tab=myEvents')
  }

  if (!user) {
    return (
      <div className={styles.manageEvent}>
        <h2>Edit Event</h2>
        <div className={styles.authRequired}>
          Please log in to edit an event.
        </div>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <h2>Edit Event</h2>
        <div className={styles.loading}>Loading event details...</div>
      </div>
    )
  }

  if (error && !fetchLoading) {
    return (
      <div className={styles.manageEvent}>
        <h2>Edit Event</h2>
        <div className={styles.errorMessage}>
          {error}
        </div>
        <button onClick={handleCancel} className={styles.cancelButton}>
          Back to My Events
        </button>
      </div>
    )
  }

  return (
    <div className={styles.manageEvent}>
      <div className={styles.header}>
        <h2>Edit Event</h2>
        <p className={styles.tagline}>Update your event details</p>
      </div>
      
      {success && (
        <div className={styles.successMessage}>
          Event updated successfully!
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
          <div className={styles.gameOptions}>
            <button
              type="button"
              className={`${styles.gameOption} ${formData.game_title === 'Game1' ? styles.gameOptionSelected : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, game_title: 'Game1' }))}
            >
              <div className={styles.gameImage}>
                <div className={styles.imagePlaceholder}>G1</div>
              </div>
              <span className={styles.gameLabel}>Game1</span>
            </button>
            <button
              type="button"
              className={`${styles.gameOption} ${formData.game_title === 'Game2' ? styles.gameOptionSelected : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, game_title: 'Game2' }))}
            >
              <div className={styles.gameImage}>
                <div className={styles.imagePlaceholder}>G2</div>
              </div>
              <span className={styles.gameLabel}>Game2</span>
            </button>
            <button
              type="button"
              className={`${styles.gameOption} ${formData.game_title === 'Game3' ? styles.gameOptionSelected : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, game_title: 'Game3' }))}
            >
              <div className={styles.gameImage}>
                <div className={styles.imagePlaceholder}>G3</div>
              </div>
              <span className={styles.gameLabel}>Game3</span>
            </button>
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

        <div className={styles.eventOptionsSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Event Options</span>
          </div>
          
          <div className={styles.formGroup}>
              <div className={styles.costSliderContainer}>
                <div className={styles.costSliderHeader}>
                  <span className={styles.costLabel}>Tickets</span>
                </div>
                <div className={styles.costSliderWrapper}>
                  <input
                    type="range"
                    id="cost"
                    name="cost"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.cost || '0'}
                    onChange={handleInputChange}
                    className={styles.costSlider}
                  />
                  <div className={styles.costSliderLabels}>
                    <span>Free</span>
                    <div className={styles.costValueDisplay}>
                      <span className={styles.costValue}>
                        {formData.cost === '' || formData.cost === '0' ? 'Free' : `$${formData.cost}`}
                      </span>
                    </div>
                    <span>$100</span>
                  </div>
                </div>
              </div>
          </div>

          <div className={styles.sectionDivider}></div>

          <div className={styles.formGroup}>
            <div className={styles.capacityContainer}>
              <div className={styles.capacityHeader}>
                <span className={styles.capacityLabel}>Capacity</span>
              </div>
              
              <div className={styles.capacityRow}>
                <div className={styles.capacityCheckboxWrapper}>
                  <input
                    type="checkbox"
                    id="capacity_enabled"
                    name="capacity_enabled"
                    checked={formData.capacity_enabled}
                    onChange={handleInputChange}
                    className={styles.capacityCheckbox}
                  />
                </div>
                
                <div className={styles.capacityInputs}>
                  <input
                    type="number"
                    id="capacity_min"
                    name="capacity_min"
                    min="0"
                    max="100"
                    value={formData.capacity_min || ''}
                    onChange={handleInputChange}
                    disabled={!formData.capacity_enabled}
                    className={styles.capacityNumberInput}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    id="capacity_max"
                    name="capacity_max"
                    min="0"
                    max="100"
                    value={formData.capacity_max || ''}
                    onChange={handleInputChange}
                    disabled={!formData.capacity_enabled}
                    className={styles.capacityNumberInput}
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.sectionDivider}></div>

          <div className={styles.formGroup}>
            <div className={styles.recurringContainer}>
              <div className={styles.recurringHeader}>
                <span className={styles.recurringLabel}>Recurring</span>
              </div>
              
              <div className={styles.recurringRow}>
                <div className={styles.recurringCheckboxWrapper}>
                  <input
                    type="checkbox"
                    id="recurring_enabled"
                    name="recurring_enabled"
                    checked={formData.recurring_enabled}
                    onChange={handleInputChange}
                    className={styles.recurringCheckbox}
                  />
                </div>
                
                <div className={styles.recurringOptions}>
                  <div className={styles.recurringFrequency}>
                    <select
                      id="recurring_frequency"
                      name="recurring_frequency"
                      value={formData.recurring_frequency}
                      onChange={handleInputChange}
                      disabled={!formData.recurring_enabled}
                      className={styles.recurringSelect}
                    >
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  
                  <div className={styles.recurringEndDate}>
                    <input
                      type="date"
                      id="recurring_end_date"
                      name="recurring_end_date"
                      value={formData.recurring_end_date}
                      onChange={handleInputChange}
                      disabled={!formData.recurring_enabled}
                      className={styles.recurringDateInput}
                    />
                  </div>
                </div>
              </div>
              
               <div className={styles.recurringDays}>
                 <div className={styles.recurringDaysGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      disabled={!formData.recurring_enabled}
                      className={`${styles.recurringDayButton} ${
                        formData.recurring_days.includes(day) ? styles.recurringDaySelected : ''
                      } ${!formData.recurring_enabled ? styles.recurringDayDisabled : ''}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.buttonGroup}>
          <button 
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Updating Event...' : 'Update Event'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
