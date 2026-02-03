/*
  # Fix lottery_bets foreign key constraints

  1. Changes
    - Modify lottery_bets.confirmed_by foreign key to use ON DELETE SET NULL
    - Modify lottery_bets.witness_id foreign key to use ON DELETE SET NULL
    
  2. Why
    - Currently these constraints use NO ACTION, which prevents deleting users
    - When a user is deleted, these fields should be set to NULL instead of blocking deletion
    
  3. Security
    - No security changes needed
    - Existing RLS policies remain in place
*/

-- Drop the existing constraints
ALTER TABLE lottery_bets 
  DROP CONSTRAINT IF EXISTS lottery_bets_confirmed_by_fkey;

ALTER TABLE lottery_bets 
  DROP CONSTRAINT IF EXISTS lottery_bets_witness_id_fkey;

-- Recreate with ON DELETE SET NULL
ALTER TABLE lottery_bets
  ADD CONSTRAINT lottery_bets_confirmed_by_fkey
  FOREIGN KEY (confirmed_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

ALTER TABLE lottery_bets
  ADD CONSTRAINT lottery_bets_witness_id_fkey
  FOREIGN KEY (witness_id)
  REFERENCES profiles(id)
  ON DELETE SET NULL;
