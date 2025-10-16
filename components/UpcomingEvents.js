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
  const [userProfile, setUserProfile] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchUpcomingEvents()
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUserRsvps()
      fetchUserProfile()
    } else {
      setUserRsvps(new Set())
      setUserProfile(null)
    }
  }, [user])

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true)
      
      // Only fetch events if user is logged in
      if (!user) {
        setEvents([])
        return
      }
      
      // Use the same successful pattern as MyEvents.js
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
        rsvpStatus: rsvp.status
      })) || []

      console.log('Fetched events:', userEvents)
      setEvents(userEvents)
    } catch (err) {
      console.error('Error fetching events:', err)
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

  const fetchUserProfile = async () => {
    if (!user) {
      setUserProfile(null)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, zip_code')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
        return
      }

      setUserProfile(data)
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setUserProfile(null)
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

  const getPersonalizedSubtitle = () => {
    if (!user || !userProfile) {
      return "Events you're attending"
    }
    
    const firstName = userProfile.first_name || 'there'
    return `Hey ${firstName}! Here are the events you're attending`
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
        <PageTitle title="Upcoming Events" subtitle={getPersonalizedSubtitle()} />
        <div className={styles.loading}>Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.upcomingEvents}>
        <PageTitle title="Upcoming Events" subtitle={getPersonalizedSubtitle()} />
        <div className={styles.error}>Error loading events: {error}</div>
      </div>
    )
  }

  return (
    <div className={styles.upcomingEvents}>
        <PageTitle title="Upcoming Events" subtitle={getPersonalizedSubtitle()} />
      {events.length === 0 ? (
        <div className={styles.noEvents}>
          {user 
            ? "You're not attending any upcoming events yet. Discover events to join!"
            : 'Please log in to see your events.'
          }
        </div>
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
                  {event.banner_image_url ? (
                    <img 
                      src={event.banner_image_url} 
                      alt={event.title}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      {event.game_title ? event.game_title.charAt(0).toUpperCase() : 'E'}
                    </div>
                  )}
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
