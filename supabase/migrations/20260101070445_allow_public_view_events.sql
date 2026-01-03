/*
  # Allow Public Access to Active Events

  ## Overview
  This migration adds RLS policies to allow unauthenticated users (guests) to view active events.
  
  ## Changes
  - Drop the existing restrictive SELECT policy for events
  - Create new policies allowing both authenticated and anonymous users to view active events
  - Admins can still view all events
  
  ## Security
  - Anonymous users can only view active events
  - All other operations still require authentication and appropriate roles
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Active events are viewable by everyone" ON events;

-- Create new policy for anonymous users to view active events
CREATE POLICY "Anonymous users can view active events"
  ON events FOR SELECT
  TO anon
  USING (status = 'active');

-- Create policy for authenticated users to view active events or all if admin
CREATE POLICY "Authenticated users can view events"
  ON events FOR SELECT
  TO authenticated
  USING (
    status = 'active' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );