/*
  # Enable Realtime for bets table

  1. Changes
    - Enable realtime replication for the `bets` table
    - This allows clients to subscribe to real-time changes on bet records
    
  2. Purpose
    - Allow event detail pages to automatically update when bets are confirmed
    - Improve user experience by showing live betting updates
*/

ALTER PUBLICATION supabase_realtime ADD TABLE bets;
