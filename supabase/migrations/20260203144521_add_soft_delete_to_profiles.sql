/*
  # 添加软删除功能到 profiles 表

  1. 变更
    - 添加 `deleted_at` 字段到 profiles 表
    - 添加 `deleted_by` 字段记录谁删除的
    - 创建视图 `active_profiles` 只显示未删除的用户
    
  2. 原因
    - 实现软删除，删除用户时不真正删除记录
    - 保留所有投注记录的用户信息和外键关联
    - 可以查看历史数据和统计
    
  3. 安全
    - 不影响现有 RLS 策略
    - deleted_at 字段可被管理员更新
*/

-- 添加软删除字段
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- 创建视图：只显示活跃（未删除）的用户
CREATE OR REPLACE VIEW active_profiles AS
SELECT * FROM profiles
WHERE deleted_at IS NULL;

-- 添加注释
COMMENT ON COLUMN profiles.deleted_at IS '软删除时间戳，NULL 表示用户未被删除';
COMMENT ON COLUMN profiles.deleted_by IS '执行软删除操作的管理员 ID';
