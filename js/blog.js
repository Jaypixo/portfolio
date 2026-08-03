(function () {
  var grid = document.getElementById('blog-grid');
  var statusEl = document.getElementById('blog-status');
  var searchInput = document.getElementById('blog-search');
  var chipsEl = document.getElementById('blog-tag-chips');
  if (!grid) return;

  var posts = [];
  var activeTag = null;

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

  function allTags() {
    var set = new Set();
    posts.forEach(function (p) { (p.tags || []).forEach(function (t) { set.add(t); }); });
    return Array.from(set).sort();
  }

  function renderChips() {
    var tags = allTags();
    if (!tags.length) { chipsEl.innerHTML = ''; return; }
    chipsEl.innerHTML = tags.map(function (t) {
      var active = t === activeTag ? ' active' : '';
      return '<button type="button" class="tag-chip' + active + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
    chipsEl.querySelectorAll('.tag-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tag = btn.getAttribute('data-tag');
        activeTag = activeTag === tag ? null : tag;
        renderChips();
        renderGrid();
      });
    });
  }

  function matchesSearch(post, query) {
    if (!query) return true;
    var haystack = (post.title + ' ' + post.excerpt + ' ' + (post.tags || []).join(' ')).toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function renderGrid() {
    var query = (searchInput.value || '').trim().toLowerCase();
    var filtered = posts.filter(function (p) {
      if (activeTag && (p.tags || []).indexOf(activeTag) === -1) return false;
      return matchesSearch(p, query);
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      statusEl.style.display = 'block';
      statusEl.textContent = posts.length ? 'No posts match your filters.' : 'No posts yet — check back soon.';
      return;
    }

    statusEl.style.display = 'none';
    grid.innerHTML = filtered.map(function (post) {
      var cover = post.coverImage ? '<img class="card-cover" src="' + escapeHtml(post.coverImage) + '" alt="" loading="lazy">' : '';
      var tags = (post.tags || []).map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('');
      var badge = post.featured ? '<span class="featured-badge">Featured</span>' : '';
      return (
        '<a class="card' + (post.featured ? ' featured' : '') + '" href="post.html?slug=' + encodeURIComponent(post.slug) + '">' +
          badge +
          cover +
          '<div class="card-meta">' + formatDate(post.createdAt) + '</div>' +
          '<h3>' + escapeHtml(post.title) + '</h3>' +
          '<p>' + escapeHtml(post.excerpt || '') + '</p>' +
          (tags ? '<div class="card-tags">' + tags + '</div>' : '') +
        '</a>'
      );
    }).join('');
  }

  function loadPosts() {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Loading posts…';
    fetch('/api/posts')
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load posts');
        return r.json();
      })
      .then(function (data) {
        posts = Array.isArray(data) ? data : [];
        renderChips();
        renderGrid();
      })
      .catch(function () {
        statusEl.style.display = 'block';
        statusEl.textContent = 'Unable to load posts right now.';
      });
  }

  searchInput.addEventListener('input', renderGrid);
  loadPosts();
})();
