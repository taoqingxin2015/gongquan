/*
  # 添加蓝球选择和奖池功能

  1. 修改表结构
    - lottery_bets表添加blue_balls字段存储用户选择的蓝球号码（1-16）
    - lottery_periods表添加pool_amount字段存储奖池累积金额
    - lottery_periods表添加winner_matched_blue字段标记中奖者是否匹配蓝球
  
  2. 数据完整性
    - blue_balls存储为JSON数组
    - pool_amount默认为0
    - winner_matched_blue默认为false
*/

-- 给lottery_bets表添加blue_balls字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_bets' AND column_name = 'blue_balls'
  ) THEN
    ALTER TABLE lottery_bets ADD COLUMN blue_balls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 给lottery_periods表添加pool_amount字段（奖池累积金额）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_periods' AND column_name = 'pool_amount'
  ) THEN
    ALTER TABLE lottery_periods ADD COLUMN pool_amount numeric DEFAULT 0 CHECK (pool_amount >= 0);
  END IF;
END $$;

-- 给lottery_periods表添加winner_matched_blue字段（中奖者是否匹配蓝球）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lottery_periods' AND column_name = 'winner_matched_blue'
  ) THEN
    ALTER TABLE lottery_periods ADD COLUMN winner_matched_blue boolean DEFAULT false;
  END IF;
END $$;

-- 给已有记录设置默认值
UPDATE lottery_bets SET blue_balls = '[]'::jsonb WHERE blue_balls IS NULL;
UPDATE lottery_periods SET pool_amount = 0 WHERE pool_amount IS NULL;
UPDATE lottery_periods SET winner_matched_blue = false WHERE winner_matched_blue IS NULL;