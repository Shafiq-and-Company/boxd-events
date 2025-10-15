# Games Table Schema

## Table: games

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the game |
| game_title | text | NOT NULL, UNIQUE | Game title/name |
| created_at | timestamptz | DEFAULT now() | When the game was added |
| updated_at | timestamptz | DEFAULT now() | When the game was last updated |

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
