/*
  # Modify Lottery Sequence Allocation Logic

  ## Overview
  This migration changes the lottery bet sequence number allocation to only assign
  sequence numbers when bets are confirmed by witnesses, not during bet creation.

  ## Changes
  1. Make sequence_start and sequence_end nullable in lottery_bets table
  2. Sequences will now be assigned only when bet status changes to 'confirmed'
  3. Pending bets will have null sequence numbers
  4. Rejected bets will be deleted from the database

  ## Migration Details
  - Alter lottery_bets table to allow null values for sequence_start and sequence_end
  - Add index on confirmed_at for proper sequence ordering
*/

-- Make sequence_start and sequence_end nullable
ALTER TABLE lottery_bets 
  ALTER COLUMN sequence_start DROP NOT NULL,
  ALTER COLUMN sequence_end DROP NOT NULL;

-- Add index on confirmed_at to ensure proper sequence ordering
CREATE INDEX IF NOT EXISTS idx_lottery_bets_confirmed_at ON lottery_bets(confirmed_at) 
  WHERE status = 'confirmed';

-- Add index on status and period_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_lottery_bets_status_period ON lottery_bets(status, period_id);
