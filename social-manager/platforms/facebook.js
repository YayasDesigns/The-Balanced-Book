/**
 * Facebook Platform Module — posts to a Facebook Page via Graph API.
 *
 * Requires:
 *   - A Facebook Page
 *   - A Meta Developer App with pages_manage_posts permission
 *   - A Page Access Token (long-lived)
 *
 * Config needed in config.json → meta:
 *   pageId, pageAccessToken
 */

const fetch = require('node-fetch');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

async function publish(post, config) {
  const { pageId, pageAccessToken } = config.meta;

  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook not configured. Run "node setup.js" to set up Meta credentials.');
  }

  const message = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;

  const response = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Facebook API error: ${data.error.message}`);
  }

  return {
    platform: 'facebook',
    postId: data.id,
    url: `https://facebook.com/${data.id}`,
  };
}

async function dryRun(post) {
  const message = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;
  return {
    platform: 'facebook',
    action: 'Would post to Facebook Page',
    messageLength: message.length,
    preview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
  };
}

module.exports = { publish, dryRun };
