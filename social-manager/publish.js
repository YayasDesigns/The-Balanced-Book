#!/usr/bin/env node

/**
 * Publisher — publishes approved posts to configured platforms.
 *
 * Usage:
 *   node publish.js              # publish all approved posts
 *   node publish.js --dry-run    # simulate without actually posting
 *   node publish.js <id>         # publish a specific post
 */

const fs = require('fs');
const path = require('path');

const QUEUE_DIR = path.join(__dirname, 'queue');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// ── Platform modules ────────────────────────────────────────────────────────

const platforms = {
  facebook: require('./platforms/facebook'),
  instagram: require('./platforms/instagram'),
  tiktok: require('./platforms/tiktok'),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Error: config.json not found. Run "node setup.js" first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function loadApprovedPosts() {
  if (!fs.existsSync(QUEUE_DIR)) return [];
  const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf-8'));
      data._file = f;
      return data;
    })
    .filter(p => p.status === 'approved')
    .sort((a, b) => a.date.localeCompare(b.date));
}

function savePost(post) {
  const filePath = path.join(QUEUE_DIR, post._file || `${post.id}.json`);
  const toSave = { ...post };
  delete toSave._file;
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificId = args.find(a => !a.startsWith('--'));

  const config = loadConfig();

  // Load posts
  let posts;
  if (specificId) {
    const allFiles = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'));
    const match = allFiles.find(f => f.startsWith(specificId));
    if (!match) {
      console.error(`Post not found: ${specificId}`);
      process.exit(1);
    }
    const post = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, match), 'utf-8'));
    post._file = match;
    posts = [post];
  } else {
    posts = loadApprovedPosts();
  }

  if (posts.length === 0) {
    console.log('\nNo approved posts to publish. Use "node queue.js approve <id>" first.\n');
    return;
  }

  console.log(`\n${dryRun ? '🧪  DRY RUN' : '📤  PUBLISHING'} — ${posts.length} post(s)\n`);

  for (const post of posts) {
    console.log(`── ${post.id} (${post.day} — ${post.theme}) ──`);

    const targetPlatforms = post.platforms || ['instagram', 'facebook', 'tiktok'];

    for (const platformName of targetPlatforms) {
      const platform = platforms[platformName];
      if (!platform) {
        console.log(`  ⚠️  Unknown platform: ${platformName}`);
        continue;
      }

      try {
        if (dryRun) {
          const result = await platform.dryRun(post, config);
          console.log(`  🧪  ${platformName}: ${result.action}`);
          if (result.preview) {
            console.log(`      Preview: "${result.preview}"`);
          }
        } else {
          const result = await platform.publish(post, config);
          if (result.skipped) {
            console.log(`  ⏭️  ${platformName}: Skipped — ${result.reason}`);
          } else {
            console.log(`  ✅  ${platformName}: Published${result.url ? ` → ${result.url}` : ''}`);
          }
        }
      } catch (err) {
        console.log(`  ❌  ${platformName}: ${err.message}`);
      }
    }

    // Mark as published (unless dry run)
    if (!dryRun) {
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      savePost(post);
    }

    console.log('');
  }

  if (dryRun) {
    console.log('🧪  Dry run complete — no posts were actually published.\n');
  } else {
    console.log(`✅  Done! ${posts.length} post(s) published.\n`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
