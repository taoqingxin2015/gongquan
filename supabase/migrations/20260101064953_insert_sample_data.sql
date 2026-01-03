/*
  # Insert Sample Data

  ## Overview
  This migration inserts initial sample data including admin profile setup and sample events.
  
  ## Important Notes
  - The admin user must be created manually through Supabase Auth Dashboard first
  - Email: admin@example.com, Password: 123456
  - After creating the admin user, update the ID in the profiles insert statement below
  
  ## Sample Data Inserted
  
  ### 1. Sample Events
  Creates several prediction events across different categories for demonstration purposes.
*/

-- Insert sample events for demonstration
INSERT INTO events (title, description, category, rules, status, reveal_date) VALUES
(
  '2026年全球经济是否会进入衰退？',
  '根据国际货币基金组织（IMF）和世界银行的预测，全球经济在2026年是否会出现负增长或严重衰退？',
  '经济',
  '以IMF和世界银行在2026年12月31日发布的全球经济增长率数据为准。如果全球GDP增长率为负值或低于1%，则判定为"是"，否则为"否"。',
  'active',
  '2026-12-31 23:59:00'
),
(
  '比特币价格在2026年是否会突破15万美元？',
  '比特币（BTC）的价格在2026年内是否会达到或超过150,000美元？',
  '金融',
  '以主流交易所（Coinbase、Binance、Kraken）在2026年12月31日23:59:59的平均价格为准。如果任一时刻价格达到或超过150,000美元，则判定为"是"。',
  'active',
  '2026-12-31 23:59:00'
),
(
  'SpaceX是否会在2026年实现载人登陆火星？',
  'SpaceX公司是否会在2026年内成功实现首次载人登陆火星任务？',
  '科技',
  '以SpaceX官方公告和NASA确认为准。必须有宇航员实际着陆火星表面才算"是"，仅环绕火星轨道或无人任务不算。',
  'active',
  '2026-12-31 23:59:00'
),
(
  '2026年世界杯冠军是巴西队吗？',
  '2026年国际足联世界杯的冠军是否会是巴西国家足球队？',
  '体育',
  '以2026年世界杯决赛的官方结果为准。如果巴西队获得冠军则为"是"，其他任何球队获胜均为"否"。',
  'active',
  '2026-07-19 23:59:00'
),
(
  '人工智能是否会在2026年通过图灵测试？',
  '是否会有AI系统在2026年被权威机构认定为通过了标准图灵测试？',
  '科技',
  '以国际知名AI研究机构（如OpenAI、DeepMind、MIT）的官方认证为准。必须通过标准的图灵测试协议，并得到学术界广泛认可。',
  'active',
  '2026-12-31 23:59:00'
),
(
  '美国2026年中期选举民主党是否会保持参议院多数席位？',
  '在2026年美国中期选举后，民主党是否仍将控制参议院多数席位？',
  '政治',
  '以2026年11月中期选举的官方计票结果为准。如果民主党获得51席或以上（包括独立党派倾向民主党的议员），则为"是"。',
  'active',
  '2026-11-04 23:59:00'
);

-- Note: To create the admin user, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create with email: admin@example.com, password: 123456
-- 3. Copy the user ID
-- 4. Run the following SQL with the actual user ID:
-- 
-- INSERT INTO profiles (id, email, name, role, referral_code, status)
-- VALUES ('[USER_ID_FROM_AUTH]', 'admin@example.com', '管理员', 'admin', 'ADMIN2026', 'active');
