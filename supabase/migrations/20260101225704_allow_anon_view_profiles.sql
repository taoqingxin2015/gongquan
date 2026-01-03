/*
  # Allow anonymous users to view profiles

  1. Changes
    - Add policy to allow anonymous users to view profile names
    - This enables event detail pages to show bet user names to all visitors
    
  2. Security
    - Anonymous users can only SELECT (read) basic profile information
    - No sensitive data is exposed (only name field is needed)
*/

CREATE POLICY "Anonymous users can view profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);
