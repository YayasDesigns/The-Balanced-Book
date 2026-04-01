#!/usr/bin/env node

/**
 * Post Queue & Review — manage social media posts before publishing.
 *
 * Usage:
 *   node queue.js list                  # show all queued posts
 *   node queue.js list pending          # filter by status
 *   node queue.js approve <id>          # mark post for publishing
 *   node queue.js reject <id>           # remove post from queue
 *   node queue.js edit <id> caption     # edit a post's caption interactively
 *   node queue.js show <id>             # show full post details
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const QUEUE_DIR = path.join(__dirname, 'queue');

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureQueueDir() {
  if (!fs.existsSync(QUEUE_DIR)) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
  }
}

function loadAllPosts() {
  ensureQueueDir();
  const files = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, f), 'utf-8'));
    data._file = f;
    return data;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function findPost(id) {
  const posts = loadAllPosts();
  return posts.find(p => p.id === id || p._file === `${id}.json`);
}

function savePost(post) {
  const filePath = path.join(QUEUE_DIR, `${post.id}.json`);
  const toSave = { ...post };
  delete toSave._file;
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2));
}

function deletePost(post) {
  const filePath = path.join(QUEUE_DIR, post._file || `${post.id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function statusBadge(status) {
  const badges = {
    pending:   '⏳ pending',
    approved:  '✅ approved',
    published: '📤 published',
    rejected:  '❌ rejected',
  };
  return badges[status] || status;
}

// ── Commands ────────────────────────────────────────────────────────────────

function cmdList(filterStatus) {
  const posts = loadAllPosts();
  const filtered = filterStatus
    ? posts.filter(p => p.status === filterStatus)
    : posts;

  if (filtered.length === 0) {
    console.log(`\nNo posts found${filterStatus ? ` with status "${filterStatus}"` : ''}.\n`);
    return;
  }

  console.log(`\n📋  Post Queue (${filtered.length} posts):\n`);
  console.log('  ID                              Day        Status         Theme');
  console.log('  ─────────────────────────────── ────────── ──────────── ──────────────────────────');

  for (const post of filtered) {
    const id = post.id.padEnd(33);
    const day = (post.day || '').padEnd(10);
    const status = statusBadge(post.status).padEnd(14);
    console.log(`  ${id} ${day} ${status} ${post.theme || ''}`);
  }

  console.log('');
}

function cmdShow(id) {
  const post = findPost(id);
  if (!post) {
    console.error(`Post not found: ${id}`);
    process.exit(1);
  }

  console.log(`\n── Post: ${post.id} ──\n`);
  console.log(`Date:    ${post.date}`);
  console.log(`Day:     ${post.day}`);
  console.log(`Theme:   ${post.theme}`);
  console.log(`Status:  ${statusBadge(post.status)}`);
  console.log(`Targets: ${(post.platforms || []).join(', ')}`);
  console.log(`\nCaption:\n${post.caption}`);
  console.log(`\nHashtags: ${(post.hashtags || []).join(' ')}`);
  console.log(`\nImage: ${post.imageDescription}`);
  console.log('');
}

function cmdApprove(id) {
  const post = findPost(id);
  if (!post) {
    console.error(`Post not found: ${id}`);
    process.exit(1);
  }

  post.status = 'approved';
  post.approvedAt = new Date().toISOString();
  savePost(post);
  console.log(`✅  Approved: ${post.id} (${post.day} — ${post.theme})`);
}

function cmdReject(id) {
  const post = findPost(id);
  if (!post) {
    console.error(`Post not found: ${id}`);
    process.exit(1);
  }

  post.status = 'rejected';
  post.rejectedAt = new Date().toISOString();
  savePost(post);
  console.log(`❌  Rejected: ${post.id}`);
}

async function cmdEdit(id, field) {
  const post = findPost(id);
  if (!post) {
    console.error(`Post not found: ${id}`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) => new Promise(resolve => rl.question(question, resolve));

  console.log(`\nEditing: ${post.id}\n`);

  if (!field || field === 'caption') {
    console.log(`Current caption:\n${post.caption}\n`);
    const newCaption = await ask('New caption (press Enter to keep current):\n');
    if (newCaption.trim()) {
      post.caption = newCaption.trim();
      console.log('Caption updated.');
    }
  }

  if (!field || field === 'hashtags') {
    console.log(`\nCurrent hashtags: ${(post.hashtags || []).join(' ')}\n`);
    const newTags = await ask('New hashtags (space-separated, Enter to keep):\n');
    if (newTags.trim()) {
      post.hashtags = newTags.trim().split(/\s+/);
      console.log('Hashtags updated.');
    }
  }

  rl.close();
  savePost(post);
  console.log(`\n💾  Saved: ${post.id}\n`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log(`
Social Media Post Queue

Commands:
  list [status]      List posts (optionally filter by: pending, approved, rejected, published)
  show <id>          Show full details of a post
  approve <id>       Mark a post as approved for publishing
  reject <id>        Mark a post as rejected
  edit <id> [field]  Edit a post's caption and/or hashtags
  help               Show this help message
`);
    return;
  }

  switch (command) {
    case 'list':
      cmdList(args[0]);
      break;
    case 'show':
      if (!args[0]) { console.error('Usage: node queue.js show <id>'); process.exit(1); }
      cmdShow(args[0]);
      break;
    case 'approve':
      if (!args[0]) { console.error('Usage: node queue.js approve <id>'); process.exit(1); }
      cmdApprove(args[0]);
      break;
    case 'reject':
      if (!args[0]) { console.error('Usage: node queue.js reject <id>'); process.exit(1); }
      cmdReject(args[0]);
      break;
    case 'edit':
      if (!args[0]) { console.error('Usage: node queue.js edit <id> [field]'); process.exit(1); }
      await cmdEdit(args[0], args[1]);
      break;
    default:
      console.error(`Unknown command: ${command}. Run "node queue.js help" for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
