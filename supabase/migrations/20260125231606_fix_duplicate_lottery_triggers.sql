/*
  # 清理重复的彩票触发器
  
  1. 问题
    - 数据库中存在两个重复的触发器绑定到同一个函数
    - trigger_update_lottery_period_totals
    - update_lottery_period_totals_trigger
  
  2. 解决方案
    - 删除所有现有的触发器
    - 创建单一的触发器
    - 确保触发器正确更新累积投注额
  
  3. 注意事项
    - 只保留一个触发器避免冲突
    - 触发器在投注确认后自动更新期数的累积数据
*/

-- 删除所有可能存在的旧触发器
DROP TRIGGER IF EXISTS trigger_update_lottery_period_totals ON lottery_bets;
DROP TRIGGER IF EXISTS update_lottery_period_totals_trigger ON lottery_bets;

-- 确保触发器函数存在并正确
CREATE OR REPLACE FUNCTION update_lottery_period_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新期数的累积投注额和投注数
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

-- 创建单一的触发器
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
