import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import PageTitle from './PageTitle'
import styles from './UpcomingEvents.module.css'

export default function UpcomingEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRsvps, setUserRsvps] = useState(new Set())
  const { user } = useAuth()

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserRsvps()
    } else {
      setUserRsvps(new Set())
    }
  }, [user])

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

  const fetchUserRsvps = async () => {
    if (!user) {
      setUserRsvps(new Set())
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('event_id, status')
        .eq('user_id', user.id)
        .eq('status', 'going')

      if (error) {
        console.error('Error fetching user RSVPs:', error)
        setUserRsvps(new Set())
        return
      }

      const rsvpEventIds = new Set(data?.map(rsvp => rsvp.event_id) || [])
      setUserRsvps(rsvpEventIds)
    } catch (err) {
      console.error('Error fetching user RSVPs:', err)
      setUserRsvps(new Set())
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
    window.location.href = `/event/${eventId}`
  }

  // Function to refresh RSVPs (can be called from parent components)
  const refreshRsvps = () => {
    if (user) {
      fetchUserRsvps()
    }
  }

  if (loading) {
    return (
      <div className={styles.upcomingEvents}>
        <PageTitle title="Upcoming Events" subtitle="Find out what's happening near you" />
        <div className={styles.loading}>Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.upcomingEvents}>
        <PageTitle title="Upcoming Events" subtitle="Find out what's happening near you" />
        <div className={styles.error}>Error loading events: {error}</div>
      </div>
    )
  }

  return (
    <div className={styles.upcomingEvents}>
      <PageTitle title="Upcoming Events" subtitle="Find out what's happening near you" />
      {events.length === 0 ? (
        <div className={styles.noEvents}>No upcoming events found.</div>
      ) : (
        <div className={styles.eventsList}>
          {events.map((event) => {
            const isRegistered = userRsvps.has(event.id)
            return (
              <div 
                key={event.id} 
                className={styles.eventCard}
                onClick={() => handleEventClick(event.id)}
              >
                <div className={styles.eventImage}>
                  <div className={styles.imagePlaceholder}>
                    {event.game_title ? event.game_title.charAt(0).toUpperCase() : 'E'}
                  </div>
                  {isRegistered && (
                    <div className={styles.registeredBadge}>
                      ✓
                    </div>
                  )}
                </div>
                
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <h3 className={styles.eventTitle}>{event.title}</h3>
                    {event.game_title && (
                      <span className={styles.gameTitle}>{event.game_title}</span>
                    )}
                  </div>
                
                <div className={styles.eventDetails}>
                  <div className={styles.eventDate}>
                    {formatDate(event.starts_at)}
                  </div>
                  
                  {event.location && (
                    <div className={styles.eventLocation}>
                      {event.location}
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
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
