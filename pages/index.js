import Head from 'next/head'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import FilterBar from '../components/FilterBar'
import BrowseByGame from '../components/BrowseByGame'
import BrowseByLocation from '../components/BrowseByLocation'

export default function Home({ events }) {
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')

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
      const title = (evt.title || '').toLowerCase()
      const description = (evt.description || '').toLowerCase()
      const loc = (evt.location || '').toLowerCase()
      const q = query.trim().toLowerCase()

      const matchesText = q
        ? title.includes(q) || description.includes(q) || loc.includes(q)
        : true

      const city = (evt.city || '').toLowerCase()
      const matchesLocation = location.trim()
        ? city.includes(location.trim().toLowerCase())
        : true

      const startsAtMs = evt.starts_at ? new Date(evt.starts_at).getTime() : undefined
      const startFilterMs = startDate ? new Date(startDate).getTime() : undefined
      const endFilterMs = endDate ? new Date(endDate).getTime() : undefined

      const matchesStart = startFilterMs !== undefined && startsAtMs !== undefined
        ? startsAtMs >= startFilterMs
        : true

      const matchesEnd = endFilterMs !== undefined && startsAtMs !== undefined
        ? startsAtMs <= endFilterMs + 24 * 60 * 60 * 1000 - 1
        : true

      return matchesText && matchesLocation && matchesStart && matchesEnd
    })
  }, [events, query, startDate, endDate, location])

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

  return (
    <div className="page">
      <Head>
        <title>Events</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1>Discover Events</h1>
        <p className="lead">Explore upcoming events and find something great nearby.</p>

        <FilterBar
          query={query}
          location={location}
          startDate={startDate}
          endDate={endDate}
          onQueryChange={setQuery}
          onLocationChange={setLocation}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClear={() => { setQuery(''); setLocation(''); setStartDate(''); setEndDate('') }}
        />

        <BrowseByGame groups={gameGroups} onPick={(name) => setQuery(name)} />
        <BrowseByLocation groups={locationGroups} onPick={(name) => setLocation(name)} />

        {(!events || events.length === 0) && (
          <p>No events found.</p>
        )}

        {events && events.length > 0 && (
          <div className="grid grid-cols-2 grid-cols-3 space-y-0">
            {(filtered || []).map((event) => (
              <article key={event.id} className="card space-y-2">
                <div className="cardMedia" />
                <div className="space-y-1">
                  <div className="cardTitle">{event.title}</div>
                  <div className="muted">
                    {event.starts_at ? new Date(event.starts_at).toLocaleString() : ''}
                  </div>
                  <div className="muted">{event.location || ''}</div>
                </div>
              </article>
            ))}
          </div>
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
