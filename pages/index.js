import Head from 'next/head'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BrowseByGame from '../components/BrowseByGame'
import BrowseByLocation from '../components/BrowseByLocation'
import UpcomingEvents from '../components/UpcomingEvents'

export default function Home({ events }) {
  const [selectedGame, setSelectedGame] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')

  const gameGroups = useMemo(() => {
    if (!events || events.length === 0) return []
    const countsByGame = new Map()
    for (const evt of events) {
      const key = (evt.game_title || '').trim()
      if (!key) continue
      countsByGame.set(key, (countsByGame.get(key) || 0) + 1)
    }
    return Array.from(countsByGame.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [events])

  const filtered = useMemo(() => {
    if (!events || events.length === 0) return []
    return events.filter((evt) => {
      const gameTitle = (evt.game_title || '').toLowerCase()
      const city = (evt.city || '').toLowerCase()
      
      const matchesGame = selectedGame.trim()
        ? gameTitle.includes(selectedGame.trim().toLowerCase())
        : true

      const matchesLocation = selectedLocation.trim()
        ? city.includes(selectedLocation.trim().toLowerCase())
        : true

      return matchesGame && matchesLocation
    })
  }, [events, selectedGame, selectedLocation])

  const locationGroups = useMemo(() => {
    if (!events || events.length === 0) return []
    const countsByCity = new Map()
    for (const evt of events) {
      const key = (evt.city || '').trim()
      if (!key) continue
      countsByCity.set(key, (countsByCity.get(key) || 0) + 1)
    }
    return Array.from(countsByCity.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [events])

  const upcomingEvents = useMemo(() => {
    if (!events || events.length === 0) return []
    const now = new Date()
    return events
      .filter(event => {
        if (!event.starts_at) return false
        const eventDate = new Date(event.starts_at)
        return eventDate > now
      })
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 4) // Top 4 for 2x2 grid
  }, [events])

  return (
    <div className="page">
      <Head>
        <title>Events</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <div className="hero-section">
          <h1>Discover Events</h1>
          <p className="lead">Find and join local gaming events</p>
        </div>

        <UpcomingEvents events={upcomingEvents} />
        
        <BrowseByGame groups={gameGroups} onPick={setSelectedGame} />
        <BrowseByLocation groups={locationGroups} onPick={setSelectedLocation} />

        {(!events || events.length === 0) && (
          <p>No events found.</p>
        )}

        {events && events.length > 0 && (
          <section aria-label="All events">
            <div className="section-header-with-action">
              <div className="filtered-title-container">
                <h2 className="section-header" style={{marginBottom: 0}}>
                  {selectedGame && selectedLocation 
                    ? `${selectedGame} Events in ${selectedLocation}`
                    : selectedGame 
                      ? `${selectedGame} Events`
                      : selectedLocation
                        ? `Events in ${selectedLocation}`
                        : 'All Events'
                  }
                </h2>
                {(selectedGame || selectedLocation) && (
                  <div className="active-filters-indicator">
                    <span className="filter-count">
                      {[selectedGame, selectedLocation].filter(Boolean).length} filter{([selectedGame, selectedLocation].filter(Boolean).length > 1) ? 's' : ''} active
                    </span>
                    <button 
                      className="clear-filters-btn"
                      onClick={() => {
                        setSelectedGame('')
                        setSelectedLocation('')
                      }}
                      title="Clear all filters"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="events-grid">
              {(filtered || []).map((event) => (
                <article key={event.id} className="modern-card">
                  <div className="card-image" style={{background: 'linear-gradient(135deg, #8b5cf6, #ec4899)'}}>
                    <div className="minimal-icon minimal-icon-purple"></div>
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{event.title}</h3>
                    <div className="card-meta">
                      {event.starts_at ? new Date(event.starts_at).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }) : ''}
                    </div>
                    <div className="card-location">{event.location || ''}</div>
                    <div className="game-badge-container">
                      {event.game_title ? (
                        <div className="game-badge" style={{background: '#f3e8ff', color: '#7c3aed'}}>
                          {event.game_title}
                        </div>
                      ) : (
                        <div className="game-badge-placeholder"></div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export async function getServerSideProps() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) {
    return { props: { events: [] } }
  }

  return {
    props: {
      events: data ?? []
    }
  }
}
