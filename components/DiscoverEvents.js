import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './DiscoverEvents.module.css'

export default function DiscoverEvents() {
  const [events, setEvents] = useState([])
  const [gameTitles, setGameTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGame, setSelectedGame] = useState('all')

  useEffect(() => {
    fetchAllEvents()
  }, [])

  const fetchAllEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('starts_at', { ascending: true })

      if (error) {
        throw error
      }

      setEvents(data || [])
      
      // Extract unique game titles
      const uniqueGameTitles = [...new Set(
        (data || [])
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleGameChange = (gameTitle) => {
    setSelectedGame(gameTitle)
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.game_title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesGame = selectedGame === 'all' || event.game_title === selectedGame
    
    return matchesSearch && matchesGame
  })

  if (loading) {
    return (
      <div className={styles.discoverEvents}>
        <h2>Discover Events</h2>
        <div className={styles.loading}>Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.discoverEvents}>
        <h2>Discover Events</h2>
        <div className={styles.error}>Error loading events: {error}</div>
      </div>
    )
  }

  return (
    <div className={styles.discoverEvents}>
      <h2>Discover Events</h2>
      
      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.gameFilters}>
          <button
            onClick={() => handleGameChange('all')}
            className={`${styles.gameButton} ${selectedGame === 'all' ? styles.active : ''}`}
          >
            All Games
          </button>
          {gameTitles.map(gameTitle => (
            <button
              key={gameTitle}
              onClick={() => handleGameChange(gameTitle)}
              className={`${styles.gameButton} ${selectedGame === gameTitle ? styles.active : ''}`}
            >
              {gameTitle}
            </button>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className={styles.noEvents}>
          {searchTerm || selectedGame !== 'all' 
            ? 'No events match your search criteria.' 
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
