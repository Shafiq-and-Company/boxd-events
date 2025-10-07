import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useState, useEffect } from 'react'

export default function EventPage() {
  const router = useRouter()
  const { id } = router.query
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return

    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          setError('Event not found')
          return
        }

        setEvent(data)
      } catch (err) {
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="event-loading">
          <div className="loading-spinner"></div>
          <p>Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="page">
        <div className="event-error">
          <h1>Event Not Found</h1>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <button 
            className="back-button"
            onClick={() => router.push('/')}
          >
            ← Back to Events
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="page">
      <Head>
        <title>{event.title} - Events</title>
        <meta name="description" content={event.description || `Join us for ${event.title}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="event-page">
        {/* Main Content Grid */}
        <div className="event-content-grid">
          {/* Clean Event Header */}
          <div className="event-header-section">
            <div className="event-badges">
              {event.game_title && (
                <span className="event-badge game-badge">{event.game_title}</span>
              )}
            <span className="event-badge location-badge">
              {event.city && event.location 
                ? `${event.location}, ${event.city}`
                : event.location || event.city || 'Location TBD'
              }
            </span>
            </div>
            
            <h1 className="event-title">{event.title}</h1>
            
            <div className="event-date-time">
              <div className="date-main">{formatDate(event.starts_at)}</div>
              {event.ends_at && (
                <div className="date-end">Ends at {formatTime(event.ends_at)}</div>
              )}
            </div>
          </div>
          {/* Primary Content */}
          <div className="event-primary">
            <div className="event-description">
              <h2>About</h2>
              <div className="description-text">
                {event.description ? (
                  <p>{event.description}</p>
                ) : (
                  <p>Join us for an exciting gaming event! More details will be shared closer to the event date.</p>
                )}
              </div>
            </div>

            <div className="event-actions">
              <button className="action-button primary">
                Join Event
              </button>
              <button className="action-button secondary">
                Share
              </button>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="event-sidebar">
            <div className="info-card">
              <h3>Details</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Date</span>
                  <span className="info-value">{formatDate(event.starts_at)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">
                    {event.city && event.location 
                      ? `${event.location}, ${event.city}`
                      : event.location || event.city || 'TBD'
                    }
                  </span>
                </div>
                {event.game_title && (
                  <div className="info-item">
                    <span className="info-label">Game</span>
                    <span className="info-value">{event.game_title}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-card">
              <h3>Host</h3>
              <div className="host-info">
                <div className="host-avatar">🎮</div>
                <div className="host-details">
                  <div className="host-name">Event Organizer</div>
                  <div className="host-role">Community Host</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
