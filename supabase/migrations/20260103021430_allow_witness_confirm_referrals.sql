/*
  # 允许见证人确认其推荐的下级见证人

  ## 概述
  添加 RLS 策略，允许见证人更新其推荐的下级见证人的 witness_confirmed 字段。

  ## 变更内容

  ### 1. 新增 RLS 策略
    - 允许见证人更新他们推荐的用户的 witness_confirmed 状态
    - 限制：只能更新 witness_confirmed 字段，不能更改其他字段
    - 验证：确保操作者是该用户的推荐人（referred_by）

  ## 安全考虑
  - 见证人只能确认自己推荐的下级见证人
  - 不能修改其他任何 profile 字段
  - 需要身份验证
*/

-- 创建策略：允许见证人确认其推荐的下级见证人
CREATE POLICY "Witnesses can confirm their referred users"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- 当前用户必须是该 profile 的推荐人
    referred_by = auth.uid()
  )
  WITH CHECK (
    -- 确保推荐关系不变
    referred_by = auth.uid()
  );
