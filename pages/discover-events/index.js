import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import styles from './DiscoverEvents.module.css'

export default function DiscoverEvents() {
  const [events, setEvents] = useState([])
  const [gameTitles, setGameTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedGame, setSelectedGame] = useState('all')
  const [userRsvps, setUserRsvps] = useState(new Set())
  const { user } = useAuth()

  useEffect(() => {
    fetchAllEvents()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserRsvps()
    } else {
      setUserRsvps(new Set())
    }
  }, [user])

  const fetchAllEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          games (id, game_title, game_background_image_url)
        `)
        .order('starts_at', { ascending: true })

      if (error) {
        throw error
      }

      // Map events to include game_title from joined games table
      const eventsWithGameTitle = (data || []).map(event => {
        const gameData = event.games 
          ? (Array.isArray(event.games) ? event.games[0] : event.games)
          : null
        return {
          ...event,
          game_title: gameData?.game_title || null,
          game_id: event.game_id || null
        }
      })

      setEvents(eventsWithGameTitle)
      
      // Extract unique game titles from joined games data
      const uniqueGameTitles = [...new Set(
        eventsWithGameTitle
          .map(event => event.game_title)
          .filter(title => title && title.trim() !== '')
      )].sort()
      
      setGameTitles(uniqueGameTitles)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRsvps = async () => {
    if (!user) return setUserRsvps(new Set())
    
    try {
      const { data, error } = await supabase
        .from('rsvps')
        .select('event_id, status')
        .eq('user_id', user.id)
        .eq('status', 'going')

      if (error) throw error

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
    window.location.href = `/view-event/${eventId}`
  }

  const handleGameChange = (gameTitle) => {
    setSelectedGame(gameTitle)
  }

  const filteredEvents = events.filter(event => 
    selectedGame === 'all' || event.game_title === selectedGame
  )

  return (
    <div className={styles.discoverEvents}>
      {loading && (
        <div className={styles.loading}>Loading events...</div>
      )}

      {error && (
        <div className={styles.error}>Error loading events: {error}</div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.filters}>
            <h2 className={styles.sectionTitle}>Browse By Category</h2>
            <div className={styles.gameFilters}>
              <div 
                onClick={() => handleGameChange('all')}
                className={`${styles.gameFilterCard} ${selectedGame === 'all' ? styles.active : ''}`}
              >
                <div className={styles.filterBackground}>
                  <span className={styles.filterTitle}>All Games</span>
                </div>
              </div>
              {gameTitles.map(gameTitle => (
                <div
                  key={gameTitle}
                  onClick={() => handleGameChange(gameTitle)}
                  className={`${styles.gameFilterCard} ${selectedGame === gameTitle ? styles.active : ''}`}
                >
                  <div className={styles.filterBackground}>
                    <span className={styles.filterTitle}>{gameTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className={styles.noEvents}>
              {selectedGame !== 'all' 
                ? 'No events match your filter criteria.' 
                : 'No events found.'}
            </div>
          ) : (
            <div className={styles.eventsList}>
              {filteredEvents.map((event) => (
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
                          objectFit: 'cover'
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
                          {event.game_title.length > 30 
                            ? `${event.game_title.substring(0, 30)}...` 
                            : event.game_title}
                        </span>
                      )}
                      <h3 className={styles.eventTitle}>{event.title}</h3>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

