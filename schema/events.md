# Events Table Documentation

## Table Schema

The `events` table stores information about gaming events and tournaments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key (unique identifier for this event) |
| `title` | text | NO | null | Event title |
| `description` | text | YES | null | Event description |
| `location` | text | YES | null | Event location |
| `starts_at` | timestamp with time zone | NO | null | Event start time |
| `ends_at` | timestamp with time zone | YES | null | Event end time |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `game_id` | bigint | YES | null | Foreign key to games table (id) |
| `city` | text | YES | null | Event city |
| `cost` | text | YES | null | Event cost (free or paid) |
| `state` | text | YES | null | Event state |
| `host_id` | uuid | YES | null | Event host user ID (foreign key to users) |
| `zip_code` | integer | YES | null | Event zip code |
| `banner_image_url` | text | YES | null | URL to banner image stored in Supabase |
| `theme` | jsonb | YES | null | Event theme configuration stored as JSON |

## Database Relationships

### Games Table
- **Foreign Key**: `events_game_id_fkey` on `game_id` references `games.id` (bigint)
- **Relationship**: Many-to-one (many events can reference one game)
- **Usage**: Links events to specific games in the games table

### Users Table
- **Foreign Key**: `events_host_id_fkey` on `host_id` references `users.id` (uuid)
- **Relationship**: Many-to-one (many events can be hosted by one user)
- **Usage**: Identifies the event host/creator

### Indexes
- **Primary Key**: `events_pkey` on `id`
- **Foreign Keys**:
  - `events_host_id_fkey` on `host_id` references `users.id`
  - `events_game_id_fkey` on `game_id` references `games.id`

## Theme Column Structure

The `theme` column stores event-specific theme configuration as JSONB. This allows each event to have its own visual styling and branding.

### Theme JSON Structure
```json
{
  "name": "default",
  "colors": {
    "background": "#ffffff",
    "primary": "#000000",
    "secondary": "#f8f8f8",
    "accent": "#333333",
    "text": "#000000",
    "textSecondary": "#666666",
    "border": "#000000"
  }
}
```

### Predefined Theme Options
- **default**: Standard black and white theme
- **dark**: Dark mode with white text on dark backgrounds
- **colorful**: Blue accent theme with light backgrounds

### Theme Usage
- **Event Creation**: Users can select a theme when creating events
- **Event Display**: Event detail pages render using the stored theme
- **CSS Variables**: Themes are applied via CSS custom properties
- **Real-time Preview**: Theme changes are visible during event creation

### Database Queries
```sql
-- Query events with theme data
SELECT id, title, theme FROM events WHERE theme IS NOT NULL;

-- Filter by specific theme
SELECT * FROM events WHERE theme->>'name' = 'dark';

-- Update event theme
UPDATE events SET theme = '{"name": "colorful", "colors": {...}}' WHERE id = 'event-uuid';

-- Query events with game information (join with games table)
SELECT 
  e.id,
  e.title,
  e.game_id,
  g.game_title,
  g.game_background_image_url
FROM events e
LEFT JOIN games g ON e.game_id = g.id;

-- Query events for a specific game
SELECT * FROM events WHERE game_id = 1;
```

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### Policy 1: Public Read Access
```sql
-- Allow anyone to read events (for public discovery)
CREATE POLICY "Anyone can view events" ON events
    FOR SELECT
    USING (true);
```
**Purpose**: Enables public event discovery without authentication

### Policy 2: Authenticated Create with Host ID
```sql
-- Allow authenticated users to create events with proper host_id
CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = host_id);
```
**Purpose**: Ensures users can only create events where they are the host

### Policy 3: Host Read Access
```sql
-- Allow event hosts to read their own events
CREATE POLICY "Hosts can read their own events" ON events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = host_id);
```
**Purpose**: Ensures hosts can read their own events (in addition to public read)

### Policy 4: Host Update Access
```sql
-- Allow event hosts to update their own events
CREATE POLICY "Hosts can update their own events" ON events
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);
```
**Purpose**: Hosts can only update events they created

### Policy 5: Host Delete Access
```sql
-- Allow event hosts to delete their own events
CREATE POLICY "Hosts can delete their own events" ON events
    FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);
```
**Purpose**: Hosts can only delete events they created

### Policy 6: Service Role Access
```sql
-- Allow service role to manage all events (for webhooks and admin)
CREATE POLICY "Service role can manage all events" ON events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables system operations and administrative access

## Implementation Notes

### Security Model
- **Public Read**: Anyone can view events for discovery
- **Host Management**: Only event hosts can manage their own events
- **Authentication Required**: All write operations require authentication
- **Host ID Validation**: Ensures users can only create events where they are the host

### Key Operations
- **Read**: Public access for discovery + Host access to own events
- **Create**: Authenticated users only (must be host)
- **Update**: Host-only access to own events
- **Delete**: Host-only access to own events
- **System**: Service role for administrative operations

### Policy Enforcement
- **INSERT**: Users can only create events where `auth.uid() = host_id`
- **SELECT**: Public read + Host read of own events
- **UPDATE**: Hosts can only update events where `auth.uid() = host_id`
- **DELETE**: Hosts can only delete events where `auth.uid() = host_id`

### Security Benefits
- Prevents users from creating events with incorrect host_id
- Ensures hosts can manage their events even if public access is restricted
- Maintains data integrity by enforcing host ownership
- Allows for future admin features while maintaining security