export default function FilterBar({
  query,
  location,
  startDate,
  endDate,
  onQueryChange,
  onLocationChange,
  onStartDateChange,
  onEndDateChange,
  onClear
}) {
  return (
    <section aria-label="Filter events" className="filterBar">
      <form onSubmit={(e) => e.preventDefault()} className="filterBar">
        <input
          type="search"
          placeholder="Search title, description, location"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
        />
        <div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>Start</div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div>
          <div className="muted" style={{ fontSize: '0.8rem' }}>End</div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
        <button type="button" onClick={onClear}>Clear</button>
      </form>
    </section>
  )
}


