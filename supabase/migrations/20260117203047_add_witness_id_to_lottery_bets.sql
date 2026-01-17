/*
  # Add witness_id to lottery_bets table

  ## Changes
  This migration adds a witness_id field to the lottery_bets table to match the structure of the regular bets table.
  
  1. New Column
    - `witness_id` (uuid, foreign key) - Reference to the witness (profiles) who will confirm the bet
  
  ## Notes
  - This field is similar to the witness_id in the bets table
  - The witness is assigned at bet creation time (the user's referred_by)
  - Different from confirmed_by which is set at confirmation time
*/

-- Add witness_id column to lottery_bets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_bets' AND column_name = 'witness_id'
  ) THEN
    ALTER TABLE lottery_bets ADD COLUMN witness_id uuid REFERENCES profiles(id);
    CREATE INDEX IF NOT EXISTS idx_lottery_bets_witness ON lottery_bets(witness_id);
  END IF;
END $$;
