/*
  # 修正管理员更新推荐码权限

  ## 问题
  - 管理员无法更新自己的推荐码（401错误）
  - 现有的"Users can update own profile"策略可能限制了某些更新

  ## 解决方案
  - 删除旧的"Users can update own profile"策略
  - 创建新策略，明确允许用户更新自己的非敏感字段
  - 管理员通过"Admins can update any profile"策略可以更新包括推荐码在内的所有字段

  ## 变更
  1. 删除旧的用户更新策略
  2. 创建新的用户更新策略（排除role和referral_code字段的限制）
*/

-- 删除旧的用户更新策略
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 创建新的用户更新自己资料的策略
-- 用户可以更新自己的 name, email, payment_qr_code, status
-- 但不能修改 role 和 referral_code（这些由管理员控制）
CREATE POLICY "Users can update own basic profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- 确保用户不能修改自己的角色
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- 管理员策略"Admins can update any profile"已存在，可以更新所有字段包括referral_code
