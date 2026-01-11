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
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const base = 1000000;
  const variance = Math.floor(Math.random() * 2000) - 1000;
  return base + variance;
}

async function fetchPolymarketMarkets() {
  console.log('Fetching markets from Polymarket...');

  try {
    const response = await fetch(`${POLYMARKET_API}/markets?limit=100&active=true`);

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Fetched ${data.length} active markets from Polymarket`);
    return data;
  } catch (error) {
    console.error('Error fetching Polymarket markets:', error);
    throw error;
  }
}

function convertPolymarketToEvent(market) {
  const yesTotal = getRandomBetAmount();
  const noTotal = getRandomBetAmount();

  const revealDate = market.endDate
    ? new Date(market.endDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return {
    title: market.question || market.title || '未命名事件',
    description: market.description || market.question || '暂无描述',
    category: mapCategory(market.category),
    rules: market.rules || '根据官方公布的结果判定',
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

  try {
    const markets = await fetchPolymarketMarkets();

    const events = markets
      .filter(market => market.active && !market.closed)
      .map(convertPolymarketToEvent)
      .slice(0, 50);

    console.log(`Converted ${events.length} markets to events format`);
    console.log();

    console.log('Sample event:');
    console.log(JSON.stringify(events[0], null, 2));
    console.log();

    const imported = await importEvents(events);

    console.log();
    console.log('='.repeat(60));
    console.log(`Import completed successfully!`);
    console.log(`Total events imported: ${imported.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('Import failed:');
    console.error(error.message);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();
