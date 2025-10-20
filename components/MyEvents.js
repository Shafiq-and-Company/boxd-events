import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageTitle from './PageTitle'
import styles from './MyEvents.module.css'

export default function MyEvents({ onTabChange }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [hostedEvents, setHostedEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [hostedLoading, setHostedLoading] = useState(true)
  const [error, setError] = useState('')
  const [hostedError, setHostedError] = useState('')


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUserEvents()
      fetchHostedEvents()
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
          payment_status,
          created_at,
          events (
            id,
            title,
            description,
            location,
            city,
            game_title,
            starts_at,
            ends_at,
            cost,
            banner_image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'going')
        .order('starts_at', { foreignTable: 'events', ascending: true })

      if (rsvpError) {
        throw rsvpError
      }

      const userEvents = rsvps?.map(rsvp => ({
        ...rsvp.events,
        rsvpStatus: rsvp.status,
        paymentStatus: rsvp.payment_status,
        rsvpCreatedAt: rsvp.created_at
      })) || []

      setEvents(userEvents)
    } catch (err) {
      console.error('Error fetching user events:', err)
      setError('Failed to load your events')
    } finally {
      setLoading(false)
    }
  }

  const fetchHostedEvents = async () => {
    try {
      setHostedLoading(true)
      setHostedError('')

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          city,
          game_title,
          starts_at,
          ends_at,
          cost,
          created_at,
          banner_image_url
        `)
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

      if (eventsError) {
        throw eventsError
      }

      setHostedEvents(events || [])
    } catch (err) {
      console.error('Error fetching hosted events:', err)
      setHostedError('Failed to load your hosted events')
    } finally {
      setHostedLoading(false)
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

  const handleEditEvent = (eventId) => {
    router.push(`/manage-event/${eventId}`)
  }

  if (authLoading || loading || hostedLoading) {
    return (
      <div className={styles.myEvents}>
        <PageTitle title="My Events" subtitle="Manage your event registrations and hosted events" />
        <div className={styles.section}>
          <div className={styles.loading}>Loading your events...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.myEvents}>
        <PageTitle title="My Events" subtitle="Manage your event registrations and hosted events" />
        <div className={styles.section}>
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
      </div>
    )
  }

  if (error || hostedError) {
    return (
      <div className={styles.myEvents}>
        <PageTitle title="My Events" subtitle="Manage your event registrations and hosted events" />
        <div className={styles.section}>
          <div className={styles.error}>
            {error && `Error loading events: ${error}`}
            {hostedError && `Error loading hosted events: ${hostedError}`}
          </div>
        </div>
      </div>
    )
  }

  const renderEventCard = (event, isHosted = false) => (
    <div 
      key={event.id} 
      className={styles.eventCard}
      onClick={() => handleEventClick(event.id)}
    >
      <div className={styles.eventImage}>
        {event.banner_image_url ? (
          <img 
            src={event.banner_image_url} 
            alt={event.title}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '6px'
            }}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            {event.game_title ? event.game_title.charAt(0).toUpperCase() : 'E'}
          </div>
        )}
      </div>
      
      <div className={styles.eventContent}>
        <div className={styles.eventHeader}>
          {event.game_title && (
            <span className={styles.gameTitle}>
              <svg className={styles.gameIcon} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="11" x2="10" y2="11"/>
                <line x1="8" y1="9" x2="8" y2="13"/>
                <line x1="15" y1="12" x2="15.01" y2="12"/>
                <line x1="18" y1="10" x2="18.01" y2="10"/>
                <path d="M17.32 5H6.68a4 4 0 0 0-4 4.34v7.32a4 4 0 0 0 4 4.34h10.64a4 4 0 0 0 4-4.34V9.34a4 4 0 0 0-4-4.34z"/>
              </svg>
              {event.game_title.length > 30 
                ? `${event.game_title.substring(0, 30)}...` 
                : event.game_title}
            </span>
          )}
          <h3 className={styles.eventTitle}>{event.title}</h3>
          <div className={styles.eventDate}>
            <svg className={styles.dateIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {formatDate(event.starts_at)}
          </div>
        </div>
        
        <div className={styles.eventDetails}>
          {event.location && (
            <div className={styles.eventLocation}>
              <svg className={styles.locationIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {event.location}
              {event.city && `, ${event.city}`}
            </div>
          )}
        </div>
        
        {isHosted && (
          <div className={styles.eventActions}>
            <button 
              className={styles.editButton}
              onClick={(e) => {
                e.stopPropagation()
                handleEditEvent(event.id)
              }}
              title="Edit event"
              aria-label="Edit event"
            >
              Manage Event
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Combine all events for display
  const allEvents = [...events, ...hostedEvents.map(event => ({ ...event, isHosted: true }))]

  return (
    <div className={styles.myEvents}>
      <PageTitle title="My Events" subtitle="Manage your event registrations and hosted events" />
      
      <div className={styles.section}>
        {allEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <p className={styles.emptyStateText}>You haven't registered for or hosted any events yet.</p>
              <p className={styles.emptyStateSubtext}>Find and join exciting gaming events or create your own.</p>
              <div className={styles.emptyStateButtons}>
                <button 
                  onClick={() => onTabChange ? onTabChange('discoverEvents') : router.push('/')}
                  className={styles.discoverButton}
                >
                  Discover Events
                </button>
                <button 
                  onClick={() => onTabChange ? onTabChange('createEvent') : router.push('/create-event')}
                  className={styles.discoverButton}
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.eventsList}>
            {allEvents.map(event => renderEventCard(event, event.isHosted))}
          </div>
        )}
      </div>
    </div>
  )
}
