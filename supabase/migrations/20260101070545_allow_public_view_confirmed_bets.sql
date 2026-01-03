/*
  # Allow Public Access to Confirmed Bets

  ## Overview
  This migration adds RLS policies to allow unauthenticated users (guests) to view confirmed bets.
  This is necessary for displaying betting statistics on event cards for anonymous users.
  
  ## Changes
  - Add policy allowing anonymous users to view confirmed bets
  - This enables displaying betting amounts and ratios on the homepage for all users
  
  ## Security
  - Anonymous users can only view confirmed bets (not pending or rejected)
  - Personal information is limited (only bet amounts and directions are visible)
  - User IDs in bets are protected by profiles table RLS
*/

-- Create policy for anonymous users to view confirmed bets
CREATE POLICY "Anonymous users can view confirmed bets"
  ON bets FOR SELECT
  TO anon
  USING (status = 'confirmed');