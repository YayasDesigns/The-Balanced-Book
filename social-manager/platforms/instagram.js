/**
 * Instagram Platform Module — posts to Instagram via Meta Graph API.
 *
 * Requires:
 *   - An Instagram Professional (Business or Creator) account
 *   - Connected to a Facebook Page
 *   - A Meta Developer App with instagram_basic + instagram_content_publish
 *   - The Instagram account ID and a Page Access Token
 *
 * Note: Instagram Graph API requires an image URL for every post.
 * This module posts the caption as a placeholder — you'll need to
 * provide image URLs in the post data or upload images separately.
 *
 * Config needed in config.json → meta:
 *   instagramAccountId, pageAccessToken
 */

const fetch = require('node-fetch');

const GRAPH_API = 'https://graph.facebook.com/v19.0';

async function publish(post, config) {
  const { instagramAccountId, pageAccessToken } = config.meta;

  if (!instagramAccountId || !pageAccessToken) {
    throw new Error('Instagram not configured. Run "node setup.js" to set up Meta credentials.');
  }

  const caption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;

  // Instagram requires an image_url. If post has one, use it.
  // Otherwise, skip with a warning.
  if (!post.imageUrl) {
    return {
      platform: 'instagram',
      skipped: true,
      reason: 'No imageUrl provided. Instagram requires an image for every post. Add an imageUrl to the queue item and try again.',
    };
  }

  // Step 1: Create a media container
  const containerRes = await fetch(`${GRAPH_API}/${instagramAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: post.imageUrl,
      caption,
      access_token: pageAccessToken,
    }),
  });

  const containerData = await containerRes.json();
  if (containerData.error) {
    throw new Error(`Instagram container error: ${containerData.error.message}`);
  }

  // Step 2: Publish the container
  const publishRes = await fetch(`${GRAPH_API}/${instagramAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: pageAccessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Instagram publish error: ${publishData.error.message}`);
  }

  return {
    platform: 'instagram',
    postId: publishData.id,
    url: `https://instagram.com`,
  };
}

async function dryRun(post) {
  const caption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;
  return {
    platform: 'instagram',
    action: post.imageUrl
      ? 'Would post image + caption to Instagram'
      : 'Would SKIP — no imageUrl provided',
    captionLength: caption.length,
    hasImage: !!post.imageUrl,
    preview: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
  };
}

module.exports = { publish, dryRun };
