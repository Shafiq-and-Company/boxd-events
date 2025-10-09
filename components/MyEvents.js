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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSignIn = () => {
    router.push('/login')
  }

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your events...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.notLoggedIn}>
          <div className={styles.signInIcon}>🔐</div>
          <h2>Sign in to view your events</h2>
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
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>Error loading events</h2>
          <p>{error}</p>
          <button 
            onClick={fetchUserEvents}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noEvents}>
          <div className={styles.noEventsIcon}>📅</div>
          <h2>No events yet</h2>
          <p>You haven't registered for any events yet.</p>
          <button 
            onClick={() => router.push('/')}
            className={styles.discoverButton}
          >
            Discover Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Events</h1>
        <p>Events you're registered for</p>
      </div>
      
      <div className={styles.eventsList}>
        {events.map((event) => (
          <div key={event.id} className={styles.eventCard}>
            <div className={styles.eventHeader}>
              <h3 className={styles.eventTitle}>{event.title}</h3>
              <span className={styles.eventStatus}>
                {event.rsvpStatus === 'going' ? '✅ Going' : event.rsvpStatus}
              </span>
            </div>
            
            {event.game_title && (
              <p className={styles.gameTitle}>🎮 {event.game_title}</p>
            )}
            
            <p className={styles.eventDescription}>{event.description}</p>
            
            <div className={styles.eventDetails}>
              <div className={styles.eventDetail}>
                <span className={styles.detailLabel}>📅 Date:</span>
                <span>{formatDate(event.starts_at)}</span>
              </div>
              
              {event.location && (
                <div className={styles.eventDetail}>
                  <span className={styles.detailLabel}>📍 Location:</span>
                  <span>{event.location}</span>
                </div>
              )}
              
              {event.city && (
                <div className={styles.eventDetail}>
                  <span className={styles.detailLabel}>🏙️ City:</span>
                  <span>{event.city}</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => router.push(`/event/${event.id}`)}
              className={styles.viewEventButton}
            >
              View Event Details
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
