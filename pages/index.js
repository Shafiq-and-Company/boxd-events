import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'

export default function Home({ events }) {
  return (
    <div className="container">
      <Head>
        <title>Events</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Events</h1>
        {(!events || events.length === 0) && (
          <p>No events found.</p>
        )}
        {events && events.length > 0 && (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                {event.starts_at && (
                  <span> — {new Date(event.starts_at).toLocaleString()}</span>
                )}
                {event.location && (
                  <span> @ {event.location}</span>
                )}
                {event.description && (
                  <p>{event.description}</p>
                )}
              </li>
            ))}
          </ul>
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
