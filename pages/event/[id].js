import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import NavBar from '../../components/NavBar'
import styles from './EventDetail.module.css'

export default function EventDetail() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleTabChange = (tab) => {
    if (tab === 'upcoming') {
      router.push('/')
    } else {
      router.push(`/?tab=${tab}`)
    }
  }

  useEffect(() => {
    if (id) {
      fetchEvent()
    }
  }, [id])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      setEvent(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRSVP = () => {
    // TODO: Implement RSVP and payment functionality
    console.log('RSVP clicked for event:', event.id)
  }

  if (loading) {
    return (
      <div>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading event...</div>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div>
        <NavBar activeTab="" onTabChange={handleTabChange} />
        <div className={styles.container}>
          <div className={styles.error}>
            {error || 'Event not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavBar activeTab="" onTabChange={handleTabChange} />
      <div className={styles.container}>
        <div className={styles.eventDetail}>
          <header className={styles.eventHeader}>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            {event.game_title && (
              <div className={styles.gameTitle}>{event.game_title}</div>
            )}
          </header>

          <div className={styles.eventContent}>
            <div className={styles.eventInfo}>
              <div className={styles.infoSection}>
                <h3>Date & Time</h3>
                <div className={styles.dateTime}>
                  <div className={styles.date}>{formatDate(event.starts_at)}</div>
                  <div className={styles.timeContainer}>
                    <div className={styles.timeLabel}>Starts:</div>
                    <div className={styles.time}>{formatTime(event.starts_at)}</div>
                  </div>
                  {event.ends_at && (
                    <div className={styles.timeContainer}>
                      <div className={styles.timeLabel}>Ends:</div>
                      <div className={styles.time}>{formatTime(event.ends_at)}</div>
                    </div>
                  )}
                </div>
              </div>

              {event.location && (
                <div className={styles.infoSection}>
                  <h3>Location</h3>
                  <div className={styles.location}>
                    {event.location}
                    {event.city && `, ${event.city}`}
                    {event.state && `, ${event.state}`}
                  </div>
                </div>
              )}

              {event.cost && (
                <div className={styles.infoSection}>
                  <h3>Price</h3>
                  <div className={styles.price}>
                    {event.cost} USD
                  </div>
                </div>
              )}

              {event.description && (
                <div className={styles.infoSection}>
                  <h3>About This Event</h3>
                  <div className={styles.description}>
                    {event.description}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.eventActions}>
              <button 
                className={styles.rsvpButton}
                onClick={handleRSVP}
              >
                RSVP Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
