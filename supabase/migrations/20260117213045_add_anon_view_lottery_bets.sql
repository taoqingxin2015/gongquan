/*
  # Allow anonymous users to view confirmed lottery bets

  ## Changes
  - Add RLS policy for anonymous users to view confirmed lottery bets
  - This aligns with the existing pattern where anon users can view confirmed regular bets
  
  ## Security
  - Only allows viewing confirmed bets (status = 'confirmed')
  - No write access for anonymous users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lottery_bets' 
    AND policyname = 'Anonymous users can view confirmed lottery bets'
  ) THEN
    CREATE POLICY "Anonymous users can view confirmed lottery bets"
      ON lottery_bets
      FOR SELECT
      TO anon
      USING (status = 'confirmed');
  END IF;
END $$;
