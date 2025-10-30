import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
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
  const [viewMode, setViewMode] = useState('upcoming') // 'upcoming' or 'past'

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
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
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
        <div className={styles.section}>
          <div className={styles.loading}>Loading your events...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.myEvents}>
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
      <div className={styles.eventContent}>
        <div className={styles.eventHeaderRow}>
          <div className={styles.eventTime}>{formatTime(event.starts_at)}</div>
          <div className={styles.eventActions}>
            {isHosted ? (
              <button
                className={styles.managePill}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditEvent(event.id)
                }}
                title="Manage event"
                aria-label="Manage event"
              >
                Manage Event
              </button>
            ) : (
              <div className={styles.goingPill}>Going</div>
            )}
          </div>
        </div>
        <h3 className={styles.eventTitle}>{event.title}</h3>
        {!event.location && (
          <div className={styles.metaWarn}>Location Missing</div>
        )}
        {event.location && (
          <div className={styles.metaRow}>
            <span className={styles.metaText}>{event.location}</span>
            {event.city && <span className={styles.metaSub}>{event.city}</span>}
          </div>
        )}
      </div>

      <div className={styles.eventThumb}
           aria-hidden="true">
        {event.banner_image_url ? (
          <img
            src={event.banner_image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            {event.game_title ? event.game_title.charAt(0).toUpperCase() : 'E'}
          </div>
        )}
      </div>
    </div>
  )

  // Combine all events for display
  const allEvents = [...events, ...hostedEvents.map(event => ({ ...event, isHosted: true }))]
  
  // Filter events based on view mode
  const now = new Date()
  const filteredEvents = allEvents.filter(event => {
    const eventDate = new Date(event.starts_at)
    return viewMode === 'upcoming' ? eventDate >= now : eventDate < now
  })

  // Build grouped-by-date structure for timeline layout
  const sortAsc = (a, b) => new Date(a.starts_at) - new Date(b.starts_at)
  const sortDesc = (a, b) => new Date(b.starts_at) - new Date(a.starts_at)
  const sorted = [...filteredEvents].sort(viewMode === 'upcoming' ? sortAsc : sortDesc)

  const groups = sorted.reduce((acc, event) => {
    const d = new Date(event.starts_at)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
    if (!acc[key]) acc[key] = { weekday, items: [] }
    acc[key].items.push(event)
    return acc
  }, {})

  return (
    <div className={styles.myEvents}>
      <div className={styles.section}>
        {allEvents.length > 0 && (
          <div className={styles.header}>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'upcoming' ? styles.active : ''}`}
                onClick={() => setViewMode('upcoming')}
              >
                Upcoming
              </button>
              <button 
                className={`${styles.toggleButton} ${viewMode === 'past' ? styles.active : ''}`}
                onClick={() => setViewMode('past')}
              >
                Past
              </button>
            </div>
          </div>
        )}
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <p className={styles.emptyStateText}>
                {allEvents.length === 0 
                  ? "You haven't registered for or hosted any events yet."
                  : `No ${viewMode} events.`
                }
              </p>
              <p className={styles.emptyStateSubtext}>
                {allEvents.length === 0 
                  ? "Find and join exciting gaming events or create your own."
                  : `You don't have any ${viewMode} events at the moment.`
                }
              </p>
              {allEvents.length === 0 && (
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
              )}
            </div>
          </div>
        ) : (
          <div className={styles.timelineWrapper}>
            {Object.entries(groups).map(([dateKey, group]) => (
              <div className={styles.dateGroup} key={dateKey}>
                <div className={styles.dateColumn}>
                  <div className={styles.dateKey}>{dateKey}</div>
                  <div className={styles.dateWeekday}>{group.weekday}</div>
                </div>
                <div className={styles.eventsColumn}>
                  <div className={styles.verticalTrack} />
                  {group.items.map(event => (
                    <div className={styles.eventItem} key={event.id}>
                      <div className={styles.trackDot} />
                      {renderEventCard(event, event.isHosted)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
