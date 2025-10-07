export default function UpcomingEvents({ events }) {
  if (!events?.length) return null

  return (
    <section aria-label="Popular events">
      <h2 className="section-header">Upcoming Events</h2>
      <div className="events-grid">
        {events.map((event) => (
          <article key={event.id} className="modern-card">
            <div className="card-image">
              <div className="minimal-icon"></div>
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
                  <div className="game-badge">
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
  )
}
