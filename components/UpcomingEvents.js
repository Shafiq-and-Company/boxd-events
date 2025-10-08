import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './UpcomingEvents.module.css'

export default function UpcomingEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5)

      if (error) {
        throw error
      }

      setEvents(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEventClick = (eventId) => {
    window.open(`/event/${eventId}`, '_blank')
  }

  if (loading) {
    return (
      <div className={styles.upcomingEvents}>
        <h2>Upcoming Events</h2>
        <div className={styles.loading}>Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.upcomingEvents}>
        <h2>Upcoming Events</h2>
        <div className={styles.error}>Error loading events: {error}</div>
      </div>
    )
  }

  return (
    <div className={styles.upcomingEvents}>
      <h2>Upcoming Events</h2>
      {events.length === 0 ? (
        <div className={styles.noEvents}>No upcoming events found.</div>
      ) : (
        <div className={styles.eventsList}>
          {events.map((event) => (
            <div 
              key={event.id} 
              className={styles.eventCard}
              onClick={() => handleEventClick(event.id)}
            >
              <div className={styles.eventHeader}>
                <h3 className={styles.eventTitle}>{event.title}</h3>
                {event.game_title && (
                  <span className={styles.gameTitle}>{event.game_title}</span>
                )}
              </div>
              
              <div className={styles.eventDetails}>
                <div className={styles.eventDate}>
                  📅 {formatDate(event.starts_at)}
                </div>
                
                {event.location && (
                  <div className={styles.eventLocation}>
                    📍 {event.location}
                    {event.city && `, ${event.city}`}
                  </div>
                )}
                
                {event.description && (
                  <div className={styles.eventDescription}>
                    {event.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
