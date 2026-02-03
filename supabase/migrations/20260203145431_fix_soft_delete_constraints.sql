/*
  # 修复软删除的约束问题
  
  1. 变更
    - 移除 email 的 UNIQUE 约束
    - 创建部分唯一索引：只对未删除用户的 email 唯一
    - 移除 profiles.id 对 auth.users 的外键约束（避免级联删除）
    
  2. 效果
    - 软删除后可以用相同 email 重新注册
    - 活跃用户的 email 仍然保持唯一
    - 删除 auth.users 不会自动删除 profiles
    - 旧投注记录保留且能显示用户名
    
  3. 安全
    - 不影响现有 RLS 策略
    - 数据完整性通过部分索引保证
*/

-- 移除 profiles.id 对 auth.users 的外键约束
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 移除 email 的 UNIQUE 约束
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 创建部分唯一索引：只对未删除的用户 email 唯一
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_when_active 
  ON profiles(email) 
  WHERE deleted_at IS NULL;

-- 添加注释
COMMENT ON INDEX profiles_email_unique_when_active IS '活跃用户的 email 必须唯一，已删除用户的 email 可以重复使用';
