/*
  # Add Betting Totals to Events Table

  1. Schema Changes
    - Add `yes_total` (numeric) to events table - Total amount bet on YES
    - Add `no_total` (numeric) to events table - Total amount bet on NO
    - Both fields default to 0

  2. Purpose
    - Track total betting amounts directly in events table for performance
    - Support displaying betting volumes without aggregating bets table
    - Enable initialization with realistic betting volumes
*/

-- Add yes_total and no_total columns to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'yes_total'
  ) THEN
    ALTER TABLE events ADD COLUMN yes_total numeric NOT NULL DEFAULT 0 CHECK (yes_total >= 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'no_total'
  ) THEN
    ALTER TABLE events ADD COLUMN no_total numeric NOT NULL DEFAULT 0 CHECK (no_total >= 0);
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_bet_totals ON events(yes_total, no_total);