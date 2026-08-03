(function () {
  var titleEl = document.getElementById('post-title');
  var metaEl = document.getElementById('post-meta');
  var tagsEl = document.getElementById('post-tags');
  var coverEl = document.getElementById('post-cover');
  var bodyEl = document.getElementById('post-body');
  var errorEl = document.getElementById('post-error');
  var progressBar = document.getElementById('reading-progress-bar');
  if (!bodyEl) return;

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function readingTime(markdown) {
    var words = (markdown || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function renderMarkdown(markdown) {
    var engine = window.remarker || window.marked;
    if (!engine) return '<p>' + escapeHtml(markdown) + '</p>';
    try {
      return typeof engine.parse === 'function' ? engine.parse(markdown) : engine(markdown);
    } catch (err) {
      console.error('Markdown render failed:', err);
      return '<p>' + escapeHtml(markdown) + '</p>';
    }
  }

  function showError(message) {
    titleEl.textContent = 'Post not found';
    document.getElementById('page-title').textContent = 'Post not found — Jaypix';
    errorEl.style.display = 'block';
    errorEl.textContent = message;
  }

  function renderPost(post) {
    document.getElementById('page-title').textContent = post.title + ' — Jaypix';
    var descEl = document.getElementById('page-description');
    if (descEl) descEl.setAttribute('content', post.excerpt || post.title);

    titleEl.textContent = post.title;
    metaEl.textContent = formatDate(post.createdAt) + ' · ' + readingTime(post.body) + ' min read';

    if (post.tags && post.tags.length) {
      tagsEl.innerHTML = post.tags.map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');
    }

    if (post.coverImage) {
      coverEl.src = post.coverImage;
      coverEl.alt = post.title;
      coverEl.style.display = 'block';
    }

    bodyEl.innerHTML = renderMarkdown(post.body || '');
  }

  function getSlug() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  function loadPost() {
    var slug = getSlug();
    if (!slug) {
      showError('No post specified.');
      return;
    }
    fetch('/api/posts/' + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(renderPost)
      .catch(function () { showError('This post could not be found.'); });
  }

  window.addEventListener('scroll', function () {
    if (!progressBar) return;
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  }, { passive: true });

  loadPost();
})();
