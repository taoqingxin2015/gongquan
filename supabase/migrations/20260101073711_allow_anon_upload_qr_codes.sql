/*
  # 允许匿名用户上传收款码
  
  1. 修改说明
    - 更新存储策略，允许匿名用户上传收款码
    - 这是注册流程必需的，因为见证人在注册时需要上传收款码
    - 见证人在注册时还未认证，处于匿名状态
  
  2. 安全说明
    - 仍然限制为 payment-qr-codes 存储桶
    - 文件大小和类型限制在存储桶级别已配置（5MB，仅图片）
*/

-- 删除原有的只允许已认证用户上传的策略
DROP POLICY IF EXISTS "Authenticated users can upload payment QR codes" ON storage.objects;

-- 创建新策略，允许匿名用户和已认证用户都可以上传
CREATE POLICY "Anyone can upload payment QR codes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-qr-codes');