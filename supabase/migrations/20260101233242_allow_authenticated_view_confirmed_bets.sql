/*
  # Allow Authenticated Users to View Confirmed Bets

  ## Overview
  This migration adds an RLS policy to allow authenticated users to view all confirmed bets.
  Previously, only anonymous users could view confirmed bets for statistics display.
  
  ## Changes
  - Add policy allowing authenticated users to view all confirmed bets
  - This enables logged-in users to see betting statistics on event cards
  
  ## Security
  - Authenticated users can view all confirmed bets (for public statistics)
  - Only confirmed bets are visible (not pending or rejected)
  - Personal information remains protected by other RLS policies
*/

-- Create policy for authenticated users to view all confirmed bets
CREATE POLICY "Authenticated users can view confirmed bets"
  ON bets FOR SELECT
  TO authenticated
  USING (status = 'confirmed');
