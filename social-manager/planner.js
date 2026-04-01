#!/usr/bin/env node

/**
 * Content Planner — generates a 7-day social media content calendar
 * using OpenRouter API for AI-generated captions.
 *
 * Usage:
 *   node planner.js              # generates calendar for next Monday
 *   node planner.js 2026-04-06   # generates calendar for specific week
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// ── Config ──────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Error: config.json not found.');
    console.error('Run "node setup.js" to create it, or copy config.example.json to config.json and fill in your API keys.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

// ── Content pillars (one per day of the week) ───────────────────────────────

const PILLARS = [
  { day: 'Monday',    theme: 'Motivation / Affirmation',    emoji: '💪' },
  { day: 'Tuesday',   theme: 'Tip / How-to',                emoji: '💡' },
  { day: 'Wednesday', theme: 'Product feature spotlight',    emoji: '📖' },
  { day: 'Thursday',  theme: 'Community / User story',       emoji: '🤝' },
  { day: 'Friday',    theme: 'Fun / Behind-the-scenes',      emoji: '🎉' },
  { day: 'Saturday',  theme: 'Wellness / Self-care',         emoji: '🧘' },
  { day: 'Sunday',    theme: 'Reflection / Week preview',    emoji: '🌅' },
];

// ── Date helpers ────────────────────────────────────────────────────────────

function getNextMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  return monday;
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── AI caption generation via OpenRouter ────────────────────────────────────

async function generateCaption(config, pillar, date) {
  const { openrouter, brand } = config;

  const prompt = `You are a social media copywriter for "${brand.name}", a hybrid planner/journal that combines productivity with mindfulness. The brand voice is warm, encouraging, and genuine.

Generate a social media post for ${pillar.day}, ${date}.
Content pillar: ${pillar.theme} ${pillar.emoji}

Requirements:
- Write a caption (2-4 short paragraphs, conversational tone)
- Include a call to action
- Suggest 8-12 hashtags (mix of branded ${brand.hashtags.join(', ')} and discovery hashtags)
- Describe an ideal image for this post (1-2 sentences)

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "caption": "The full caption text with line breaks as \\n",
  "hashtags": ["#tag1", "#tag2"],
  "imageDescription": "Description of the ideal image"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': brand.website,
      'X-Title': brand.name,
    },
    body: JSON.stringify({
      model: openrouter.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();

  // Parse JSON from the response (handle potential markdown code blocks)
  let cleaned = content;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn(`Warning: Could not parse AI response for ${pillar.day}. Using raw text.`);
    return {
      caption: content,
      hashtags: [...brand.hashtags],
      imageDescription: 'Brand-colored flat lay with planner and cozy items',
    };
  }
}

// ── Output formatters ───────────────────────────────────────────────────────

function toMarkdown(weekStart, posts) {
  let md = `# Content Calendar — Week of ${weekStart}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n---\n\n`;

  for (const post of posts) {
    md += `## ${post.pillar.emoji} ${post.pillar.day} (${post.date}) — ${post.pillar.theme}\n\n`;
    md += `**Caption:**\n${post.caption}\n\n`;
    md += `**Hashtags:** ${post.hashtags.join(' ')}\n\n`;
    md += `**Image idea:** ${post.imageDescription}\n\n`;
    md += `---\n\n`;
  }

  return md;
}

function toJSON(weekStart, posts) {
  return JSON.stringify({
    weekOf: weekStart,
    generated: new Date().toISOString(),
    posts: posts.map(p => ({
      date: p.date,
      day: p.pillar.day,
      theme: p.pillar.theme,
      caption: p.caption,
      hashtags: p.hashtags,
      imageDescription: p.imageDescription,
    })),
  }, null, 2);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();

  // Determine week start date
  let startDate;
  const arg = process.argv[2];
  if (arg) {
    startDate = new Date(arg + 'T00:00:00');
    if (isNaN(startDate.getTime())) {
      console.error(`Invalid date: ${arg}. Use YYYY-MM-DD format.`);
      process.exit(1);
    }
  } else {
    startDate = getNextMonday();
  }

  const weekStart = formatDate(startDate);
  console.log(`\n📅  Generating content calendar for week of ${weekStart}...\n`);

  const posts = [];

  for (let i = 0; i < 7; i++) {
    const pillar = PILLARS[i];
    const date = formatDate(addDays(startDate, i));

    process.stdout.write(`  ${pillar.emoji}  ${pillar.day} (${date})... `);

    try {
      const result = await generateCaption(config, pillar, date);
      posts.push({
        date,
        pillar,
        caption: result.caption,
        hashtags: result.hashtags,
        imageDescription: result.imageDescription,
      });
      console.log('done');
    } catch (err) {
      console.log(`error: ${err.message}`);
      posts.push({
        date,
        pillar,
        caption: `[Error generating caption: ${err.message}]`,
        hashtags: config.brand.hashtags,
        imageDescription: 'Placeholder — regenerate this post',
      });
    }
  }

  // Save outputs
  const calendarsDir = path.join(__dirname, 'calendars');
  if (!fs.existsSync(calendarsDir)) fs.mkdirSync(calendarsDir);

  const mdPath = path.join(calendarsDir, `week-${weekStart}.md`);
  const jsonPath = path.join(calendarsDir, `week-${weekStart}.json`);

  fs.writeFileSync(mdPath, toMarkdown(weekStart, posts));
  fs.writeFileSync(jsonPath, toJSON(weekStart, posts));

  console.log(`\n✅  Calendar saved:`);
  console.log(`    📄  ${mdPath}`);
  console.log(`    📦  ${jsonPath}`);

  // Also add posts to the queue
  const queueDir = path.join(__dirname, 'queue');
  if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir);

  let queueCount = 0;
  for (const post of posts) {
    const id = `${post.date}-${post.pillar.day.toLowerCase()}`;
    const queueItem = {
      id,
      date: post.date,
      day: post.pillar.day,
      theme: post.pillar.theme,
      caption: post.caption,
      hashtags: post.hashtags,
      imageDescription: post.imageDescription,
      platforms: ['instagram', 'facebook', 'tiktok'],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(queueDir, `${id}.json`),
      JSON.stringify(queueItem, null, 2)
    );
    queueCount++;
  }

  console.log(`    📋  ${queueCount} posts added to queue (status: pending)\n`);
  console.log(`Next steps:`);
  console.log(`  1. Review: node queue.js list`);
  console.log(`  2. Approve: node queue.js approve <id>`);
  console.log(`  3. Publish: node publish.js\n`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
