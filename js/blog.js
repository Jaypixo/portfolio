// ─── BLOG PAGE BEHAVIOR ───
// Loads the post list from the Cloudflare KV-backed API, then supports
// client-side search and tag filtering. Relies on helpers from markdown.js.

let allPosts = [];
let activeTag = null;

function loadBlogPosts() {
  const container = document.getElementById('blog-posts');
  if (!container) return;

  fetch('/api/posts')
    .then(r => {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    })
    .then(posts => {
      allPosts = Array.from(new Map((posts || []).map(post => [String(post.id), post])).values());
      renderTagFilters();
      renderPosts();
    })
    .catch(err => {
      console.error('Failed to load posts:', err);
      container.innerHTML = '<p class="blog-empty">Unable to load posts.</p>';
    });
}

function renderTagFilters() {
  const wrap = document.getElementById('blog-tags');
  if (!wrap) return;

  const tags = new Set();
  allPosts.forEach(post => (post.tags || []).forEach(tag => tags.add(tag)));
  if (!tags.size) {
    wrap.innerHTML = '';
    return;
  }

  const sorted = Array.from(tags).sort();
  wrap.innerHTML = `<button class="tag-chip ${activeTag === null ? 'active' : ''}" data-tag="">all</button>` +
    sorted.map(tag => `<button class="tag-chip ${activeTag === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('');

  wrap.querySelectorAll('.tag-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTag = btn.dataset.tag || null;
      renderTagFilters();
      renderPosts();
    });
  });
}

function renderPosts() {
  const container = document.getElementById('blog-posts');
  if (!container) return;

  const search = (document.getElementById('blog-search')?.value || '').trim().toLowerCase();

  let posts = allPosts;
  if (activeTag) posts = posts.filter(post => (post.tags || []).includes(activeTag));
  if (search) {
    posts = posts.filter(post =>
      post.title.toLowerCase().includes(search) ||
      post.content.toLowerCase().includes(search) ||
      (post.tags || []).some(tag => tag.toLowerCase().includes(search))
    );
  }

  if (!posts.length) {
    container.innerHTML = '<p class="blog-empty">No posts found.</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="blog-post">
      <div class="blog-post-title">${escapeHtml(post.title)}</div>
      <div class="blog-post-date">${new Date(post.date).toLocaleDateString()} · ${estimateReadingTime(post.content)} min read</div>
      ${(post.tags && post.tags.length) ? `<div class="blog-post-tags">${post.tags.map(tag => `<span class="tag-chip-sm">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      <div class="blog-post-content">${escapeHtml(extractExcerpt(post.content))}</div>
      <a class="blog-post-link" href="post.html?slug=${encodeURIComponent(post.slug || post.id)}">Read more →</a>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('blog-search');
  if (search) search.addEventListener('input', renderPosts);
  loadBlogPosts();
});
