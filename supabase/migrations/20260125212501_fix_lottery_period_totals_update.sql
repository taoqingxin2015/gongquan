/*
  # Auto-update Lottery Period Totals

  ## Overview
  This migration adds a trigger to automatically update the `total_amount` and `total_bets` 
  fields in the `lottery_periods` table whenever a bet is confirmed or updated.

  ## Changes
  1. Functions
    - `update_lottery_period_totals()` - Recalculates totals for a lottery period
  
  2. Triggers
    - After INSERT, UPDATE, or DELETE on `lottery_bets` where status = 'confirmed'
    - Automatically updates the corresponding period's totals

  ## Notes
  - This ensures cumulative bet amounts are always accurate
  - Only confirmed bets are counted towards totals
*/

-- Function to update lottery period totals
CREATE OR REPLACE FUNCTION update_lottery_period_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the lottery period totals based on confirmed bets
  UPDATE lottery_periods
  SET 
    total_amount = COALESCE((
      SELECT SUM(bet_amount)
      FROM lottery_bets
      WHERE period_id = COALESCE(NEW.period_id, OLD.period_id)
        AND status = 'confirmed'
    ), 0),
    total_bets = COALESCE((
      SELECT SUM(bet_count)
      FROM lottery_bets
      WHERE period_id = COALESCE(NEW.period_id, OLD.period_id)
        AND status = 'confirmed'
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.period_id, OLD.period_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_lottery_period_totals ON lottery_bets;

-- Create trigger for lottery_bets
CREATE TRIGGER trigger_update_lottery_period_totals
  AFTER INSERT OR UPDATE OR DELETE ON lottery_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_lottery_period_totals();
