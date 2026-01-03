/*
  # 添加见证人确认机制

  ## 概述
  为见证人注册流程添加上级确认环节，确保见证人网络的可控性和质量。

  ## 变更内容

  ### 1. 修改 `profiles` 表
    - 添加 `witness_confirmed` 字段（boolean, 默认 false）
      - 用于标记见证人是否已被推荐者确认
      - 玩家（player）默认为 true，无需确认
      - 见证人（witness）默认为 false，需要上级确认
      - 管理员（admin）默认为 true，无需确认

  ## 重要说明
  - 现有所有用户的 witness_confirmed 默认设置为 true（向后兼容）
  - 新注册的见证人将需要上级确认才能使用完整功能
  - 玩家角色不需要确认流程
*/

-- 添加 witness_confirmed 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'witness_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN witness_confirmed boolean DEFAULT false;
  END IF;
END $$;

-- 为现有用户设置合理的默认值（向后兼容）
-- 玩家和管理员：自动确认
-- 现有见证人：也自动确认（向后兼容）
UPDATE profiles
SET witness_confirmed = true
WHERE witness_confirmed = false;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_witness_confirmed ON profiles(witness_confirmed);

-- 更新 profiles 表的 RLS 策略注释
COMMENT ON COLUMN profiles.witness_confirmed IS '见证人是否已被上级确认：player和admin自动为true，witness需要上级确认';
