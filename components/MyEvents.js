import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import styles from './MyEvents.module.css'

export default function MyEvents() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUserEvents()
    }
  }, [user, authLoading, router])

  const fetchUserEvents = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: rsvps, error: rsvpError } = await supabase
        .from('rsvps')
        .select(`
          event_id,
          status,
          events (
            id,
            title,
            description,
            location,
            city,
            game_title,
            starts_at,
            ends_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'going')

      if (rsvpError) {
        throw rsvpError
      }

      const userEvents = rsvps?.map(rsvp => ({
        ...rsvp.events,
        rsvpStatus: rsvp.status
      })) || []

      setEvents(userEvents)
    } catch (err) {
      console.error('Error fetching user events:', err)
      setError('Failed to load your events')
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
    router.push(`/event/${eventId}`)
  }

  const handleSignIn = () => {
    router.push('/login')
  }

  if (authLoading || loading) {
    return (
      <div className={styles.myEvents}>
        <h2>My Events</h2>
        <div className={styles.loading}>Loading your events...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.myEvents}>
        <h2>My Events</h2>
        <div className={styles.notLoggedIn}>
          <p>You need to be signed in to see your registered events.</p>
          <button 
            onClick={handleSignIn}
            className={styles.signInButton}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.myEvents}>
        <h2>My Events</h2>
        <div className={styles.error}>Error loading events: {error}</div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={styles.myEvents}>
        <h2>My Events</h2>
        <p className={styles.tagline}>Events you're registered for</p>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateContent}>
            <p className={styles.emptyStateText}>You haven't registered for any events yet.</p>
            <p className={styles.emptyStateSubtext}>Discover exciting gaming events and tournaments happening near you.</p>
            <button 
              onClick={() => router.push('/')}
              className={styles.discoverButton}
            >
              Discover Events
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.myEvents}>
      <h2>My Events</h2>
      <p className={styles.tagline}>Events you're registered for</p>
      
      <div className={styles.eventsList}>
        {events.map((event) => (
          <div 
            key={event.id} 
            className={styles.eventCard}
            onClick={() => handleEventClick(event.id)}
          >
            <div className={styles.eventImage}>
              <div className={styles.imagePlaceholder}>
                {event.game_title ? event.game_title.charAt(0).toUpperCase() : 'E'}
              </div>
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
        ))}
      </div>
    </div>
  )
}
