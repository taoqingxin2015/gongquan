import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function getRandomBetAmount(): number {
  const base = 1000000;
  const variance = Math.floor(Math.random() * 2000) - 1000;
  return base + variance;
}

function generateSampleEvents(count = 20) {
  const templates = [
    { title: '2026年美国中期选举中民主党是否能保持参议院多数席位？', category: '政治' },
    { title: '比特币价格是否会在2026年6月前突破10万美元？', category: '加密货币' },
    { title: 'OpenAI 是否会在2026年发布 GPT-5？', category: '科技' },
    { title: '2026年世界杯足球赛冠军会是巴西队吗？', category: '体育' },
    { title: '特斯拉股价是否会在2026年第二季度突破300美元？', category: '经济' },
    { title: '2026年夏季奥运会举办城市是否能如期举办？', category: '体育' },
    { title: 'SpaceX 是否会在2026年实现载人火星登陆？', category: '科技' },
    { title: '美联储是否会在2026年上半年降息？', category: '经济' },
    { title: '中国经济增长率是否会在2026年超过5%？', category: '经济' },
    { title: '人工智能是否会在2026年通过图灵测试？', category: '科技' },
    { title: '电影《阿凡达3》是否会成为2026年全球票房冠军？', category: '娱乐' },
    { title: '全球气温是否会在2026年再创历史新高？', category: '时事' },
    { title: '苹果是否会在2026年发布折叠屏iPhone？', category: '科技' },
    { title: '2026年诺贝尔和平奖得主会来自非洲吗？', category: '时事' },
    { title: '黄金价格是否会在2026年底前突破每盎司3000美元？', category: '经济' },
    { title: 'NBA 2025-2026赛季总冠军会是洛杉矶湖人队吗？', category: '体育' },
    { title: '微软市值是否会在2026年突破4万亿美元？', category: '经济' },
    { title: '量子计算机是否会在2026年实现商业化应用？', category: '科技' },
    { title: '2026年全球新能源汽车销量是否会超过传统燃油车？', category: '经济' },
    { title: '某知名科技公司CEO是否会在2026年卸任？', category: '时事' }
  ];

  return templates.slice(0, count).map((template) => {
    const daysToAdd = Math.floor(Math.random() * 180) + 30;
    const revealDate = new Date();
    revealDate.setDate(revealDate.getDate() + daysToAdd);

    return {
      title: template.title,
      description: `${template.title}\n\n本事件基于公开信息和市场预期，结果将在揭晓日期后根据官方公布的信息进行判定。投注者需要关注相关新闻和公告，做出自己的判断。`,
      category: template.category,
      rules: '根据官方公布的结果或权威媒体报道判定。如果在揭晓日期前事件已有明确结果，将提前结算。如果揭晓日期时仍无法判定，将延期至有明确结果为止。',
      status: 'active',
      reveal_date: revealDate.toISOString(),
      yes_total: getRandomBetAmount(),
      no_total: getRandomBetAmount(),
    };
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '缺少认证头' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 使用 anon key 验证用户身份
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: '无效的认证令牌' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 检查是否是管理员
    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: '获取用户信息失败：' + profileError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: '需要管理员权限' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 使用 service role key 插入数据，绕过 RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const events = generateSampleEvents(20);

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert(events)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: '插入失败：' + error.message, details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: data.length,
        message: `成功导入 ${data.length} 个事件`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误：' + (error.message || '未知错误'), details: error.toString() }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});