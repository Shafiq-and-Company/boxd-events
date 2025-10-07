export default function BrowseByLocation({ groups, onPick }) {
  if (!groups || groups.length === 0) return null
  return (
    <section className="space-y-2" aria-label="Browse by location" style={{ marginBottom: '1rem' }}>
      <div className="muted" style={{ fontWeight: 600 }}>Browse by Location</div>
      <div className="grid grid-cols-2 grid-cols-3" style={{ alignItems: 'start' }}>
        {groups.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className="badge"
            onClick={() => onPick(name)}
            title={`Show events in ${name}`}
            style={{ textAlign: 'left' }}
          >
            {name} ({count})
          </button>
        ))}
      </div>
    </section>
  )
}


