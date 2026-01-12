import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

const CATEGORY_MAPPING: Record<string, string> = {
  'Politics': '政治',
  'Crypto': '加密货币',
  'Sports': '体育',
  'Business': '经济',
  'Science': '科技',
  'Pop Culture': '娱乐',
  'News': '时事',
};

function mapCategory(polymarketCategory: string): string {
  return CATEGORY_MAPPING[polymarketCategory] || '其他';
}

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

function convertPolymarketToEvent(market: any) {
  const yesTotal = getRandomBetAmount();
  const noTotal = getRandomBetAmount();

  const endDate = market.endDate || market.end_date;
  const revealDate = endDate
    ? new Date(endDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const title = market.question || market.title || '未命名事件';
  const description = market.description || market.groupItemTitle || title;

  return {
    title: title.substring(0, 200),
    description: description.substring(0, 500),
    category: mapCategory(market.category),
    rules: market.rules || '根据 Polymarket 官方公布的结果判定。事件将在揭晓日期后由见证人根据公开信息进行判定。',
    status: 'active',
    reveal_date: revealDate.toISOString(),
    yes_total: yesTotal,
    no_total: noTotal,
  };
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
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
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

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let events: any[] = [];

    try {
      const response = await fetch(`${POLYMARKET_API}/markets?limit=500&closed=false`);
      
      if (response.ok) {
        const markets = await response.json();
        
        const now = new Date();
        const futureMarkets = markets.filter((market: any) => {
          const endDate = market.endDate || market.end_date;
          if (!endDate) return false;
          const marketEndDate = new Date(endDate);
          return marketEndDate > now;
        });

        if (futureMarkets.length > 0) {
          events = futureMarkets
            .map(convertPolymarketToEvent)
            .slice(0, 50);
        }
      }
    } catch (error) {
      console.error('Error fetching from Polymarket:', error);
    }

    if (events.length === 0) {
      events = generateSampleEvents(20);
    }

    const { data, error } = await supabaseClient
      .from('events')
      .insert(events)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
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
        message: `Successfully imported ${data.length} events`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.toString() }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});