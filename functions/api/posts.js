import { errorResponse, jsonResponse, requireAdmin, encodeContent } from '../lib.js';

const GITHUB_API = 'https://api.github.com';
const PUBLIC_POSTS_PATH = '/posts.json';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const assetUrl = new URL(PUBLIC_POSTS_PATH, request.url);
    const response = await fetch(assetUrl.toString());
    if (!response.ok) {
      return errorResponse('Unable to load posts', 502);
    }
    return new Response(response.body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'PUT') {
    const auth = await requireAdmin(request, env);
    if (!auth) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.posts)) {
      return errorResponse('Missing posts array', 400);
    }

    if (!env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_TOKEN) {
      return errorResponse('GitHub integration not configured', 500);
    }

    const branch = env.GITHUB_BRANCH || 'main';
    const contentsUrl = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/posts.json?ref=${branch}`;

    const getResponse = await fetch(contentsUrl, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });

    if (!getResponse.ok) {
      return errorResponse('Failed to read posts.json from GitHub', 502);
    }

    const fileInfo = await getResponse.json();
    if (!fileInfo.sha) {
      return errorResponse('Unable to determine file SHA', 502);
    }

    const contentString = JSON.stringify(body.posts, null, 2) + '\n';
    const commitBody = {
      message: 'Update blog posts via admin panel',
      content: encodeContent(contentString),
      sha: fileInfo.sha,
      branch
    };

    const putResponse = await fetch(`${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/posts.json`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitBody)
    });

    if (!putResponse.ok) {
      const errorBody = await putResponse.text();
      return errorResponse(`GitHub update failed: ${errorBody}`, 502);
    }

    const result = await putResponse.json();
    return jsonResponse({ success: true, commitUrl: result.commit?.html_url || null });
  }

  return errorResponse('Method not allowed', 405);
}
