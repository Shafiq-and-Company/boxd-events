# Games Table Schema

## Table: games

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PRIMARY KEY | Unique identifier for the game |
| created_at | timestamp with time zone | NOT NULL, DEFAULT now() | When the game was added |
| game_title | text | NULL | Game title/name |
| game_logo_url | text | NULL | URL to game logo image |

## Indexes
- `idx_games_game_title` on `game_title` for fast lookups

## Relationships
- One-to-many with events table via `game_title` field

## RLS Policies

### Enable RLS
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
```

### Allow authenticated users to read games
```sql
CREATE POLICY "Allow authenticated users to read games" ON games
  FOR SELECT
  TO authenticated
  USING (true);
```

This policy allows any authenticated user to read all games from the table, which is needed for the CreateEvent form to populate the game selection options.
