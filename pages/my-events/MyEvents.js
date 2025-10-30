import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import styles from './MyEvents.module.css'

const VIEW_MODES = {
  UPCOMING: 'upcoming',
  PAST: 'past'
}

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const groupEventsByDate = (events, viewMode) => {
  const now = new Date()
  const filtered = events.filter(event => {
    const eventDate = new Date(event.starts_at)
    return viewMode === VIEW_MODES.UPCOMING ? eventDate >= now : eventDate < now
  })

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.starts_at)
    const dateB = new Date(b.starts_at)
    return viewMode === VIEW_MODES.UPCOMING 
      ? dateA - dateB 
      : dateB - dateA
  })

  return sorted.reduce((acc, event) => {
    const date = new Date(event.starts_at)
    const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
    
    if (!acc[key]) {
      acc[key] = { weekday, items: [] }
    }
    acc[key].items.push(event)
    return acc
  }, {})
}

export default function MyEvents({ onTabChange }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState([])
  const [hostedEvents, setHostedEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [hostedLoading, setHostedLoading] = useState(true)
  const [error, setError] = useState('')
  const [hostedError, setHostedError] = useState('')
  const [viewMode, setViewMode] = useState(VIEW_MODES.UPCOMING)

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
            game_id,
            starts_at,
            ends_at,
            cost,
            banner_image_url,
            games (game_title)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'going')
        .order('starts_at', { foreignTable: 'events', ascending: true })

      if (rsvpError) throw rsvpError

      const userEvents = rsvps?.map(rsvp => ({
        ...rsvp.events,
        game_title: rsvp.events?.games?.game_title || null,
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
          game_id,
          starts_at,
          ends_at,
          cost,
          created_at,
          banner_image_url,
          games (game_title)
        `)
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

      if (eventsError) throw eventsError

      const hostedEventsWithGameTitle = events?.map(event => ({
        ...event,
        game_title: event.games?.game_title || null
      })) || []

      setHostedEvents(hostedEventsWithGameTitle)
    } catch (err) {
      console.error('Error fetching hosted events:', err)
      setHostedError('Failed to load your hosted events')
    } finally {
      setHostedLoading(false)
    }
  }

  const allEvents = useMemo(() => {
    return [...events, ...hostedEvents.map(event => ({ ...event, isHosted: true }))]
  }, [events, hostedEvents])

  const groupedEvents = useMemo(() => {
    return groupEventsByDate(allEvents, viewMode)
  }, [allEvents, viewMode])

  const hasEvents = allEvents.length > 0
  const filteredEventsCount = Object.values(groupedEvents).reduce((sum, group) => sum + group.items.length, 0)

  const handleEventClick = (eventId) => {
    router.push(`/view-event/${eventId}`)
  }

  const handleEditEvent = (eventId, e) => {
    e.stopPropagation()
    router.push(`/manage-event/${eventId}`)
  }

  const handleTabChange = (tab) => {
    onTabChange ? onTabChange(tab) : router.push(tab === 'discoverEvents' ? '/' : '/create-event')
  }

  const renderEventCard = (event) => (
    <div 
      className={styles.eventCard}
      onClick={() => handleEventClick(event.id)}
    >
      <div className={styles.eventContent}>
        <div className={styles.eventHeaderRow}>
          <div className={styles.eventTime}>{formatTime(event.starts_at)}</div>
          <div className={styles.eventActions}>
            {event.isHosted ? (
              <button
                className={styles.managePill}
                onClick={(e) => handleEditEvent(event.id, e)}
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
        {!event.location ? (
          <div className={styles.metaWarn}>Location Missing</div>
        ) : (
          <div className={styles.metaRow}>
            <span className={styles.metaText}>{event.location}</span>
            {event.city && <span className={styles.metaSub}>{event.city}</span>}
          </div>
        )}
      </div>
      <div className={styles.eventThumb} aria-hidden="true">
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
              onClick={() => router.push('/login')}
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

  return (
    <div className={styles.myEvents}>
      <div className={styles.section}>
        {hasEvents && (
          <div className={styles.header}>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleButton} ${viewMode === VIEW_MODES.UPCOMING ? styles.active : ''}`}
                onClick={() => setViewMode(VIEW_MODES.UPCOMING)}
              >
                Upcoming
              </button>
              <button 
                className={`${styles.toggleButton} ${viewMode === VIEW_MODES.PAST ? styles.active : ''}`}
                onClick={() => setViewMode(VIEW_MODES.PAST)}
              >
                Past
              </button>
            </div>
          </div>
        )}
        {filteredEventsCount === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <p className={styles.emptyStateText}>
                {!hasEvents 
                  ? "You haven't registered for or hosted any events yet."
                  : `No ${viewMode} events.`
                }
              </p>
              <p className={styles.emptyStateSubtext}>
                {!hasEvents 
                  ? "Find and join exciting gaming events or create your own."
                  : `You don't have any ${viewMode} events at the moment.`
                }
              </p>
              {!hasEvents && (
                <div className={styles.emptyStateButtons}>
                  <button 
                    onClick={() => handleTabChange('discoverEvents')}
                    className={styles.discoverButton}
                  >
                    Discover Events
                  </button>
                  <button 
                    onClick={() => handleTabChange('createEvent')}
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
            {Object.entries(groupedEvents).map(([dateKey, group]) => (
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
                      {renderEventCard(event)}
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

