/*
  # 修复彩票期数累积投注额自动更新触发器
  
  1. 变更
    - 创建触发器来自动更新 lottery_periods 的 total_amount 和 total_bets
    - 触发器在 lottery_bets 的 INSERT/UPDATE/DELETE 时触发
    - 修复所有现有期数的累积投注额数据
  
  2. 说明
    - 触发器函数已存在，只需创建触发器绑定
    - 同时修复所有现有数据的累积投注额
*/

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS update_lottery_period_totals_trigger ON lottery_bets;

-- 创建触发器
CREATE TRIGGER update_lottery_period_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON lottery_bets
  FOR EACH ROW
  EXECUTE FUNCTION update_lottery_period_totals();

-- 修复所有现有期数的累积投注额
UPDATE lottery_periods
SET 
  total_amount = COALESCE((
    SELECT SUM(bet_amount)
    FROM lottery_bets
    WHERE period_id = lottery_periods.id
      AND status = 'confirmed'
  ), 0),
  total_bets = COALESCE((
    SELECT SUM(bet_count)
    FROM lottery_bets
    WHERE period_id = lottery_periods.id
      AND status = 'confirmed'
  ), 0),
  updated_at = now();
