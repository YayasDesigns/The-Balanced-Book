#!/usr/bin/env node

/**
 * Setup Wizard — interactive walkthrough to configure API credentials.
 *
 * Usage:
 *   node setup.js          # full setup
 *   node setup.js openrouter   # configure just OpenRouter
 *   node setup.js meta         # configure just Meta (Facebook/Instagram)
 *   node setup.js tiktok       # configure just TikTok
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const EXAMPLE_PATH = path.join(__dirname, 'config.example.json');

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadExistingConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  if (fs.existsSync(EXAMPLE_PATH)) {
    return JSON.parse(fs.readFileSync(EXAMPLE_PATH, 'utf-8'));
  }
  return {
    openrouter: { apiKey: '', model: 'anthropic/claude-sonnet-4-20250514' },
    meta: { appId: '', appSecret: '', pageId: '', pageAccessToken: '', instagramAccountId: '' },
    tiktok: { clientKey: '', clientSecret: '', accessToken: '' },
    brand: {
      name: 'The Balanced Book',
      handle: '@thebalancedbook',
      website: 'https://yayasdesigns.github.io/The-Balanced-Book/',
      hashtags: ['#TheBalancedBook', '#PlanReflectGrow', '#BalancedLiving'],
    },
  };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function mask(value) {
  if (!value || value.length < 8) return value ? '***' : '(not set)';
  return value.substring(0, 4) + '...' + value.substring(value.length - 4);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

// ── Setup sections ──────────────────────────────────────────────────────────

async function setupOpenRouter(config) {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   OpenRouter API (Content Generation) ║');
  console.log('╚══════════════════════════════════════╝\n');

  console.log('OpenRouter lets you use AI models to generate social media captions.');
  console.log('1. Go to https://openrouter.ai and create a free account');
  console.log('2. Go to https://openrouter.ai/keys to create an API key');
  console.log('3. Paste your API key below\n');

  const current = config.openrouter.apiKey;
  const key = await ask(`OpenRouter API key ${current ? `[current: ${mask(current)}]` : ''}: `);
  if (key.trim()) config.openrouter.apiKey = key.trim();

  const model = await ask(`AI model [current: ${config.openrouter.model}] (Enter to keep): `);
  if (model.trim()) config.openrouter.model = model.trim();

  console.log('✅  OpenRouter configured.\n');
}

async function setupMeta(config) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Meta API (Facebook + Instagram Publishing)  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  console.log('To post to Facebook and Instagram, you need:');
  console.log('');
  console.log('1. A Facebook Page for your brand');
  console.log('2. A Meta Developer account → https://developers.facebook.com');
  console.log('3. Create a new app (type: Business)');
  console.log('4. Add the "Facebook Login" and "Instagram Graph API" products');
  console.log('5. Get a Page Access Token with these permissions:');
  console.log('   - pages_manage_posts');
  console.log('   - pages_read_engagement');
  console.log('   - instagram_basic');
  console.log('   - instagram_content_publish');
  console.log('');
  console.log('For Instagram, you also need your Instagram Business account');
  console.log('connected to the Facebook Page.\n');

  const fields = [
    { key: 'appId', label: 'Meta App ID' },
    { key: 'appSecret', label: 'Meta App Secret' },
    { key: 'pageId', label: 'Facebook Page ID' },
    { key: 'pageAccessToken', label: 'Page Access Token (long-lived)' },
    { key: 'instagramAccountId', label: 'Instagram Account ID' },
  ];

  for (const { key, label } of fields) {
    const current = config.meta[key];
    const value = await ask(`${label} ${current ? `[current: ${mask(current)}]` : ''}: `);
    if (value.trim()) config.meta[key] = value.trim();
  }

  console.log('✅  Meta API configured.\n');
}

async function setupTikTok(config) {
  console.log('\n╔═══════════════════════════════════╗');
  console.log('║   TikTok Content Posting API       ║');
  console.log('╚═══════════════════════════════════╝\n');

  console.log('To post to TikTok, you need:');
  console.log('');
  console.log('1. A TikTok Developer account → https://developers.tiktok.com');
  console.log('2. Create a new app');
  console.log('3. Apply for the "Content Posting API" scope');
  console.log('4. Complete the OAuth flow to get an access token');
  console.log('');
  console.log('Note: TikTok app review can take a few days.\n');

  const fields = [
    { key: 'clientKey', label: 'TikTok Client Key' },
    { key: 'clientSecret', label: 'TikTok Client Secret' },
    { key: 'accessToken', label: 'TikTok Access Token' },
  ];

  for (const { key, label } of fields) {
    const current = config.tiktok[key];
    const value = await ask(`${label} ${current ? `[current: ${mask(current)}]` : ''}: `);
    if (value.trim()) config.tiktok[key] = value.trim();
  }

  console.log('✅  TikTok configured.\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const section = process.argv[2];
  const config = loadExistingConfig();

  console.log('\n🔧  The Balanced Book — Social Media Manager Setup\n');

  if (!section || section === 'openrouter') await setupOpenRouter(config);
  if (!section || section === 'meta') await setupMeta(config);
  if (!section || section === 'tiktok') await setupTikTok(config);

  saveConfig(config);
  rl.close();

  console.log('─────────────────────────────────────────');
  console.log('💾  Configuration saved to config.json');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Generate content:  node planner.js');
  console.log('  2. Review posts:      node queue.js list');
  console.log('  3. Approve posts:     node queue.js approve <id>');
  console.log('  4. Publish:           node publish.js');
  console.log('  5. Test first:        node publish.js --dry-run');
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
