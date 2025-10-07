export default function BrowseByGame({ groups, onPick }) {
  if (!groups?.length) return null

  return (
    <section aria-label="Browse by game">
      <h2 className="section-header">Browse by Category</h2>
      <div className="category-grid">
        {groups.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className="category-card"
            onClick={() => onPick(name)}
            title={`Show ${name} events`}
          >
            <div className="category-icon">
              <div className="minimal-shape minimal-shape-blue"></div>
            </div>
            <div className="category-name">{name}</div>
            <div className="category-count">{count} Events</div>
          </button>
        ))}
      </div>
    </section>
  )
}


