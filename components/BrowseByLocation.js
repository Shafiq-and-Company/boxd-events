export default function BrowseByLocation({ groups, onPick }) {
  if (!groups?.length) return null

  return (
    <section aria-label="Browse by location">
      <h2 className="section-header">Browse by Location</h2>
      <div className="category-grid">
        {groups.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className="location-card"
            onClick={() => onPick(name)}
            title={`Show events in ${name}`}
          >
            <div className="location-icon">
              <div className="minimal-shape minimal-shape-green"></div>
            </div>
            <div className="category-name">{name}</div>
            <div className="category-count">{count} Events</div>
          </button>
        ))}
      </div>
    </section>
  )
}


