/**
 * Import Polymarket Data to Supabase
 *
 * This script fetches active markets from Polymarket API and imports them
 * into the Supabase events table with appropriate categorization.
 *
 * Usage:
 *   node scripts/import-polymarket-data.js
 *
 * Requirements:
 *   - VITE_SUPABASE_URL environment variable
 *   - VITE_SUPABASE_ANON_KEY environment variable
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

const CATEGORY_MAPPING = {
  'Politics': '政治',
  'Crypto': '加密货币',
  'Sports': '体育',
  'Business': '经济',
  'Science': '科技',
  'Pop Culture': '娱乐',
  'News': '时事',
};

function mapCategory(polymarketCategory) {
  return CATEGORY_MAPPING[polymarketCategory] || '其他';
}

function getRandomBetAmount() {
  return 0;
}

async function fetchPolymarketMarkets() {
  console.log('Fetching markets from Polymarket...');

  try {
    const response = await fetch(`${POLYMARKET_API}/markets?limit=500&closed=false`);

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} markets from Polymarket`);

    return data;
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    throw error;
  }
}

function generateSampleEvents(count = 20) {
  const categories = ['政治', '经济', '科技', '体育', '娱乐', '时事'];
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

  return templates.slice(0, count).map((template, index) => {
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

function convertPolymarketToEvent(market) {
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

async function importEvents(events) {
  console.log(`Importing ${events.length} events into Supabase...`);

  const { data, error } = await supabase
    .from('events')
    .insert(events)
    .select();

  if (error) {
    console.error('Error importing events:', error);
    throw error;
  }

  console.log(`Successfully imported ${data.length} events`);
  return data;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Polymarket Data Import Script');
  console.log('='.repeat(60));
  console.log();

  let events = [];

  try {
    const markets = await fetchPolymarketMarkets();

    const now = new Date();
    const futureMarkets = markets.filter(market => {
      const endDate = market.endDate || market.end_date;
      if (!endDate) return false;
      const marketEndDate = new Date(endDate);
      return marketEndDate > now;
    });

    console.log(`Found ${futureMarkets.length} future markets out of ${markets.length} total`);

    if (futureMarkets.length > 0) {
      events = futureMarkets
        .map(convertPolymarketToEvent)
        .slice(0, 50);
      console.log(`Converted ${events.length} Polymarket markets to events`);
    }
  } catch (error) {
    console.error('Error fetching from Polymarket:', error.message);
    console.log('Will use sample data instead...');
  }

  if (events.length === 0) {
    console.log('Generating sample events...');
    events = generateSampleEvents(20);
    console.log(`Generated ${events.length} sample events`);
  }

  console.log();

  if (events.length > 0) {
    console.log('Sample event:');
    console.log(JSON.stringify(events[0], null, 2));
    console.log();

    const imported = await importEvents(events);

    console.log();
    console.log('='.repeat(60));
    console.log(`Import completed successfully!`);
    console.log(`Total events imported: ${imported.length}`);
    console.log('='.repeat(60));
  } else {
    console.log('No events to import.');
  }
}

main();
