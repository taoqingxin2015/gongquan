/*
  # Allow anonymous users to view lottery periods

  ## Changes
  - Add RLS policy for anonymous users to view all lottery periods
  - This aligns with the existing pattern where anon users can view events
  
  ## Security
  - Only SELECT access for anonymous users
  - No write access for anonymous users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lottery_periods' 
    AND policyname = 'Anonymous users can view lottery periods'
  ) THEN
    CREATE POLICY "Anonymous users can view lottery periods"
      ON lottery_periods
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
