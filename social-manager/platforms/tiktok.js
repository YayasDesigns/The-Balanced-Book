/**
 * TikTok Platform Module — posts text/photo content via TikTok Content Posting API.
 *
 * Requires:
 *   - A TikTok Developer account + app
 *   - The video.publish or video.upload scope
 *   - An access token from OAuth flow
 *
 * Note: TikTok's API primarily supports video content. For photo posts,
 * you'll need to create a video or use their photo mode (if available).
 * This module creates a text-based "post intent" that you can pair with media.
 *
 * Config needed in config.json → tiktok:
 *   clientKey, clientSecret, accessToken
 */

const fetch = require('node-fetch');

const TIKTOK_API = 'https://open.tiktokapis.com/v2';

async function publish(post, config) {
  const { accessToken } = config.tiktok;

  if (!accessToken) {
    throw new Error('TikTok not configured. Run "node setup.js" to set up TikTok credentials.');
  }

  // TikTok Content Posting API — create a post
  // This requires video content. For now, we create a photo post if supported.
  const caption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;

  if (!post.videoUrl && !post.imageUrl) {
    return {
      platform: 'tiktok',
      skipped: true,
      reason: 'No videoUrl or imageUrl provided. TikTok requires media for every post.',
    };
  }

  // Initialize a photo or video post
  const mediaType = post.videoUrl ? 'VIDEO' : 'PHOTO';
  const initBody = {
    post_info: {
      title: caption.substring(0, 150),
      privacy_level: 'PUBLIC_TO_EVERYONE',
    },
    source_info: {
      source: 'PULL_FROM_URL',
    },
  };

  if (mediaType === 'VIDEO') {
    initBody.source_info.video_url = post.videoUrl;
  } else {
    initBody.media_type = 'PHOTO';
    initBody.source_info.photo_urls = [post.imageUrl];
  }

  const response = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(initBody),
  });

  const data = await response.json();

  if (data.error && data.error.code !== 'ok') {
    throw new Error(`TikTok API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return {
    platform: 'tiktok',
    publishId: data.data?.publish_id,
    status: 'initiated',
  };
}

async function dryRun(post) {
  const caption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;
  return {
    platform: 'tiktok',
    action: (post.videoUrl || post.imageUrl)
      ? 'Would post to TikTok'
      : 'Would SKIP — no media provided',
    captionLength: Math.min(caption.length, 150),
    hasVideo: !!post.videoUrl,
    hasImage: !!post.imageUrl,
    preview: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
  };
}

module.exports = { publish, dryRun };
