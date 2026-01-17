/*
  # Update lottery_bets RLS policies for witness access

  ## Changes
  This migration updates the RLS policies on lottery_bets to allow witnesses to view and confirm bets assigned to them.
  
  1. Policy Updates
    - Drop and recreate the view policy to allow witnesses to see bets assigned to them
    - Add policy for witnesses to view bets where they are the witness
  
  ## Security
  - Witnesses can view bets where witness_id = their user id
  - Witnesses can update bets where witness_id = their user id to confirm them
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view confirmed bets" ON lottery_bets;
DROP POLICY IF EXISTS "Witnesses can confirm bets" ON lottery_bets;

-- Recreate view policy: users can see confirmed bets, their own bets, and bets they are witness for
CREATE POLICY "Users can view relevant lottery bets"
  ON lottery_bets FOR SELECT
  TO authenticated
  USING (
    status = 'confirmed' 
    OR user_id = auth.uid()
    OR witness_id = auth.uid()
  );

-- Witnesses can update bets where they are the witness
CREATE POLICY "Witnesses can confirm lottery bets"
  ON lottery_bets FOR UPDATE
  TO authenticated
  USING (witness_id = auth.uid())
  WITH CHECK (witness_id = auth.uid());
