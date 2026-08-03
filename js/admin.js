(function () {
  var el = {};
  ['auth-gate', 'admin-password', 'login-btn', 'auth-error', 'admin-app', 'admin-banner',
   'new-post-btn', 'logout-btn', 'sidebar-search', 'post-list', 'admin-editor', 'editor-empty',
   'editor-form', 'editor-status-pill', 'unsaved-dot', 'view-live-link', 'copy-link-btn',
   'delete-post-btn', 'save-post-btn', 'field-title', 'field-slug', 'regen-slug-btn', 'slug-hint',
   'field-excerpt', 'fill-excerpt-btn', 'excerpt-count', 'tags-wrap', 'field-tags', 'field-cover',
   'cover-preview', 'field-published', 'field-featured', 'field-body', 'body-preview',
   'word-count', 'read-time'
  ].forEach(function (id) { el[id.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = document.getElementById(id); });

  var state = {
    token: localStorage.getItem('adminToken') || '',
    posts: [],
    currentId: null,
    currentApiSlug: null,
    tags: [],
    slugManual: false,
    settingSlug: false,
    savedSnapshot: null,
    filter: 'all',
    bannerTimeout: null
  };

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function slugify(input) {
    return String(input || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
  }

  function renderMarkdown(markdown) {
    var engine = window.remarker || window.marked;
    if (!engine) return '<p>' + escapeHtml(markdown) + '</p>';
    try {
      return typeof engine.parse === 'function' ? engine.parse(markdown) : engine(markdown);
    } catch (err) {
      console.error('Markdown preview failed:', err);
      return '<p style="color:var(--red);">Preview failed to render (this does not affect saving).</p>';
    }
  }

  function plainExcerpt(markdown, maxLen) {
    var plain = (markdown || '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '$1')
      .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
      .replace(/[#>*`_~\-+=|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length <= maxLen ? plain : plain.slice(0, maxLen).trim() + '…';
  }

  function hasUsableToken() {
    if (!state.token) return false;
    var parts = state.token.split('.');
    if (parts.length !== 3) return false;
    try {
      var base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      var payload = JSON.parse(atob(padded));
      return typeof payload.exp === 'number' && Date.now() <= payload.exp;
    } catch (e) {
      return false;
    }
  }

  function authHeaders() {
    return { Authorization: 'Bearer ' + state.token, 'Content-Type': 'application/json' };
  }

  function showBanner(message, type) {
    el.adminBanner.textContent = message;
    el.adminBanner.className = 'admin-banner visible ' + type;
    clearTimeout(state.bannerTimeout);
    state.bannerTimeout = setTimeout(function () { el.adminBanner.classList.remove('visible'); }, 4000);
  }

  // ---- Auth ----
  function login() {
    var password = el.adminPassword.value;
    if (!password) return;
    el.loginBtn.disabled = true;
    el.loginBtn.textContent = 'Logging in…';
    el.authError.textContent = '';
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Login failed');
        state.token = res.data.token;
        localStorage.setItem('adminToken', state.token);
        enterApp();
      })
      .catch(function (err) { el.authError.textContent = err.message; })
      .finally(function () {
        el.loginBtn.disabled = false;
        el.loginBtn.textContent = 'Log in';
      });
  }

  function logout() {
    if (isDirty() && !confirm('You have unsaved changes. Log out anyway?')) return;
    state.token = '';
    localStorage.removeItem('adminToken');
    el.adminApp.style.display = 'none';
    el.authGate.style.display = 'block';
  }

  function enterApp() {
    el.authGate.style.display = 'none';
    el.adminApp.style.display = 'block';
    loadPosts();
  }

  // ---- Posts data ----
  function loadPosts() {
    fetch('/api/posts', { headers: authHeaders() })
      .then(function (r) {
        if (r.status === 401) { logoutSilently(); throw new Error('Session expired'); }
        if (!r.ok) throw new Error('Failed to load posts');
        return r.json();
      })
      .then(function (data) {
        state.posts = Array.isArray(data) ? data : [];
        renderSidebar();
      })
      .catch(function (err) { showBanner(err.message, 'error'); });
  }

  function logoutSilently() {
    state.token = '';
    localStorage.removeItem('adminToken');
    el.adminApp.style.display = 'none';
    el.authGate.style.display = 'block';
    el.authError.textContent = 'Your session expired. Please log in again.';
  }

  function filteredPosts() {
    var query = (el.sidebarSearch.value || '').trim().toLowerCase();
    return state.posts
      .filter(function (p) {
        if (state.filter === 'published' && !p.published) return false;
        if (state.filter === 'draft' && p.published) return false;
        if (!query) return true;
        var haystack = (p.title + ' ' + (p.tags || []).join(' ')).toLowerCase();
        return haystack.indexOf(query) !== -1;
      })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function renderSidebar() {
    var list = filteredPosts();
    if (!list.length) {
      el.postList.innerHTML = '<li class="post-list-empty">No posts found.</li>';
      return;
    }
    el.postList.innerHTML = list.map(function (p) {
      var selected = p.id === state.currentId ? ' selected' : '';
      var pill = p.published
        ? '<span class="status-pill published">Published</span>'
        : '<span class="status-pill draft">Draft</span>';
      var featured = p.featured ? '<span class="status-pill featured">★</span>' : '';
      return (
        '<li class="post-row' + selected + '" data-id="' + escapeHtml(p.id) + '">' +
          '<div class="row-title">' + escapeHtml(p.title || 'Untitled') + '</div>' +
          '<div class="row-meta">' + pill + featured + '</div>' +
          '<div class="row-actions">' +
            '<button type="button" data-action="toggle-publish" data-id="' + escapeHtml(p.id) + '">' + (p.published ? 'Unpublish' : 'Publish') + '</button>' +
            '<button type="button" class="danger" data-action="delete" data-id="' + escapeHtml(p.id) + '">Delete</button>' +
          '</div>' +
        '</li>'
      );
    }).join('');
  }

  // ---- Editor ----
  function snapshot() {
    return JSON.stringify({
      title: el.fieldTitle.value,
      slug: el.fieldSlug.value,
      excerpt: el.fieldExcerpt.value,
      body: el.fieldBody.value,
      published: el.fieldPublished.checked,
      featured: el.fieldFeatured.checked,
      tags: state.tags,
      coverImage: el.fieldCover.value
    });
  }

  function isDirty() {
    if (el.editorForm.style.display === 'none') return false;
    return state.savedSnapshot !== null && state.savedSnapshot !== snapshot();
  }

  function updateUnsavedDot() {
    el.unsavedDot.classList.toggle('visible', isDirty());
  }

  function renderTags() {
    var chips = state.tags.map(function (t, i) {
      return '<span class="chip">' + escapeHtml(t) + '<button type="button" data-index="' + i + '">×</button></span>';
    }).join('');
    var input = el.tagsWrap.querySelector('input');
    el.tagsWrap.innerHTML = chips;
    el.tagsWrap.appendChild(input);
    el.tagsWrap.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tags.splice(Number(btn.getAttribute('data-index')), 1);
        renderTags();
        updateUnsavedDot();
      });
    });
  }

  function addTagFromInput() {
    var value = el.fieldTags.value.trim().toLowerCase().replace(/,+$/, '');
    if (value && state.tags.indexOf(value) === -1) state.tags.push(value);
    el.fieldTags.value = '';
    renderTags();
    updateUnsavedDot();
  }

  function updateStatsAndPreview() {
    var body = el.fieldBody.value;
    var words = body.trim() ? body.trim().split(/\s+/).length : 0;
    el.wordCount.textContent = words + ' word' + (words === 1 ? '' : 's');
    el.readTime.textContent = Math.max(1, Math.round(words / 200)) + ' min read';
    el.bodyPreview.innerHTML = body.trim() ? renderMarkdown(body) : '<p style="color:var(--smudge);">Nothing to preview yet.</p>';
  }

  function updateStatusPill() {
    el.editorStatusPill.textContent = el.fieldPublished.checked ? 'Published' : 'Draft';
    el.editorStatusPill.className = 'status-pill ' + (el.fieldPublished.checked ? 'published' : 'draft');
  }

  function updateCoverPreview() {
    var url = el.fieldCover.value.trim();
    if (url && /^https?:\/\//i.test(url)) {
      el.coverPreview.src = url;
      el.coverPreview.classList.add('visible');
    } else {
      el.coverPreview.classList.remove('visible');
      el.coverPreview.src = '';
    }
  }

  function updateActionVisibility() {
    var hasId = Boolean(state.currentId);
    el.deletePostBtn.style.display = hasId ? 'inline-flex' : 'none';
    el.copyLinkBtn.style.display = hasId ? 'inline-flex' : 'none';
    var slug = el.fieldSlug.value.trim();
    if (hasId && el.fieldPublished.checked && slug) {
      el.viewLiveLink.style.display = 'inline-flex';
      el.viewLiveLink.href = 'post.html?slug=' + encodeURIComponent(slug);
    } else {
      el.viewLiveLink.style.display = 'none';
    }
    el.slugHint.textContent = slug ? window.location.origin + '/post.html?slug=' + encodeURIComponent(slug) : 'jaypix.dev/post.html?slug=…';
  }

  function fillForm(post) {
    el.fieldTitle.value = post.title || '';
    state.settingSlug = true;
    el.fieldSlug.value = post.slug || '';
    state.settingSlug = false;
    el.fieldExcerpt.value = post.excerpt || '';
    el.fieldBody.value = post.body || '';
    el.fieldPublished.checked = Boolean(post.published);
    el.fieldFeatured.checked = Boolean(post.featured);
    el.fieldCover.value = post.coverImage || '';
    state.tags = (post.tags || []).slice();
    state.slugManual = Boolean(post.slug);
    renderTags();
    el.excerptCount.textContent = String(el.fieldExcerpt.value.length);
    updateStatsAndPreview();
    updateStatusPill();
    updateCoverPreview();
    updateActionVisibility();
    state.savedSnapshot = snapshot();
    updateUnsavedDot();
  }

  function openEditor() {
    el.editorEmpty.style.display = 'none';
    el.editorForm.style.display = 'block';
    el.editorForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectPost(id) {
    if (isDirty() && !confirm('You have unsaved changes. Discard them?')) return;
    var post = state.posts.find(function (p) { return p.id === id; });
    if (!post) return;
    state.currentId = post.id;
    state.currentApiSlug = post.slug;
    openEditor();
    fillForm(post);
    renderSidebar();
  }

  function newPost() {
    if (isDirty() && !confirm('You have unsaved changes. Discard them?')) return;
    state.currentId = null;
    state.currentApiSlug = null;
    openEditor();
    fillForm({ title: '', slug: '', excerpt: '', body: '', published: false, featured: false, tags: [], coverImage: '' });
    el.fieldTitle.focus();
    renderSidebar();
  }

  function validateDraft(draft) {
    if (!draft.title.trim()) return 'Title is required.';
    if (!draft.slug.trim()) return 'Slug is required.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug.trim())) return 'Slug can only contain lowercase letters, numbers, and hyphens.';
    return null;
  }

  function savePost() {
    var draft = {
      title: el.fieldTitle.value.trim(),
      slug: el.fieldSlug.value.trim(),
      excerpt: el.fieldExcerpt.value.trim(),
      body: el.fieldBody.value,
      published: el.fieldPublished.checked,
      featured: el.fieldFeatured.checked,
      tags: state.tags,
      coverImage: el.fieldCover.value.trim()
    };

    var validationError = validateDraft(draft);
    if (validationError) { showBanner(validationError, 'error'); return; }

    var isNew = !state.currentId;
    var url = isNew ? '/api/posts' : '/api/posts/' + encodeURIComponent(state.currentApiSlug);
    var method = isNew ? 'POST' : 'PUT';

    el.savePostBtn.disabled = true;
    el.savePostBtn.textContent = 'Saving…';

    fetch(url, { method: method, headers: authHeaders(), body: JSON.stringify(draft) })
      .then(function (r) {
        if (r.status === 401) { logoutSilently(); throw new Error('Session expired'); }
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.data.error || 'Save failed');
        var saved = res.data;
        state.currentId = saved.id;
        state.currentApiSlug = saved.slug;
        var idx = state.posts.findIndex(function (p) { return p.id === saved.id; });
        if (idx === -1) state.posts.push(saved); else state.posts[idx] = saved;
        fillForm(saved);
        renderSidebar();
        showBanner('Saved.', 'success');
      })
      .catch(function (err) { showBanner(err.message, 'error'); })
      .finally(function () {
        el.savePostBtn.disabled = false;
        el.savePostBtn.textContent = 'Save';
      });
  }

  function deleteBySlug(slug, id) {
    return fetch('/api/posts/' + encodeURIComponent(slug), { method: 'DELETE', headers: authHeaders() })
      .then(function (r) {
        if (r.status === 401) { logoutSilently(); throw new Error('Session expired'); }
        if (!r.ok) return r.json().then(function (data) { throw new Error(data.error || 'Delete failed'); });
        state.posts = state.posts.filter(function (p) { return p.id !== id; });
        if (state.currentId === id) {
          state.currentId = null;
          state.currentApiSlug = null;
          state.savedSnapshot = null;
          el.editorForm.style.display = 'none';
          el.editorEmpty.style.display = 'block';
        }
        renderSidebar();
        showBanner('Post deleted.', 'success');
      })
      .catch(function (err) { showBanner(err.message, 'error'); });
  }

  function deleteCurrentPost() {
    if (!state.currentApiSlug || !state.currentId) return;
    if (!confirm('Delete "' + el.fieldTitle.value + '"? This cannot be undone.')) return;
    deleteBySlug(state.currentApiSlug, state.currentId);
  }

  function copyLink() {
    var slug = el.fieldSlug.value.trim();
    if (!slug) return;
    var link = window.location.origin + '/post.html?slug=' + encodeURIComponent(slug);
    navigator.clipboard.writeText(link).then(function () {
      showBanner('Link copied.', 'success');
    }).catch(function () {
      showBanner(link, 'info');
    });
  }

  // ---- Events ----
  el.loginBtn.addEventListener('click', login);
  el.adminPassword.addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  el.logoutBtn.addEventListener('click', logout);
  el.newPostBtn.addEventListener('click', newPost);
  el.sidebarSearch.addEventListener('input', renderSidebar);

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.filter = btn.getAttribute('data-filter');
      renderSidebar();
    });
  });

  el.postList.addEventListener('click', function (e) {
    var actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      var id = actionBtn.getAttribute('data-id');
      var action = actionBtn.getAttribute('data-action');
      var post = state.posts.find(function (p) { return p.id === id; });
      if (!post) return;
      if (action === 'delete') {
        if (confirm('Delete "' + post.title + '"? This cannot be undone.')) deleteBySlug(post.slug, post.id);
      } else if (action === 'toggle-publish') {
        fetch('/api/posts/' + encodeURIComponent(post.slug), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(Object.assign({}, post, { published: !post.published }))
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (!res.ok) throw new Error(res.data.error || 'Update failed');
            var idx = state.posts.findIndex(function (p) { return p.id === res.data.id; });
            if (idx !== -1) state.posts[idx] = res.data;
            if (state.currentId === res.data.id) fillForm(res.data);
            renderSidebar();
          })
          .catch(function (err) { showBanner(err.message, 'error'); });
      }
      return;
    }
    var row = e.target.closest('.post-row');
    if (row) selectPost(row.getAttribute('data-id'));
  });

  el.fieldTitle.addEventListener('input', function () {
    if (!state.slugManual) {
      state.settingSlug = true;
      el.fieldSlug.value = slugify(el.fieldTitle.value);
      state.settingSlug = false;
      updateActionVisibility();
    }
    updateUnsavedDot();
  });
  el.fieldSlug.addEventListener('input', function () {
    if (!state.settingSlug) state.slugManual = true;
    updateActionVisibility();
    updateUnsavedDot();
  });
  el.regenSlugBtn.addEventListener('click', function () {
    state.settingSlug = true;
    el.fieldSlug.value = slugify(el.fieldTitle.value);
    state.settingSlug = false;
    state.slugManual = false;
    updateActionVisibility();
    updateUnsavedDot();
  });

  el.fieldExcerpt.addEventListener('input', function () {
    el.excerptCount.textContent = String(el.fieldExcerpt.value.length);
    updateUnsavedDot();
  });
  el.fillExcerptBtn.addEventListener('click', function () {
    el.fieldExcerpt.value = plainExcerpt(el.fieldBody.value, 400);
    el.excerptCount.textContent = String(el.fieldExcerpt.value.length);
    updateUnsavedDot();
  });

  el.fieldTags.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput(); }
    else if (e.key === 'Backspace' && !el.fieldTags.value && state.tags.length) {
      state.tags.pop();
      renderTags();
      updateUnsavedDot();
    }
  });
  el.fieldTags.addEventListener('blur', function () { if (el.fieldTags.value.trim()) addTagFromInput(); });

  el.fieldCover.addEventListener('input', function () { updateCoverPreview(); updateUnsavedDot(); });
  el.coverPreview.addEventListener('error', function () { el.coverPreview.classList.remove('visible'); });

  el.fieldPublished.addEventListener('change', function () { updateStatusPill(); updateActionVisibility(); updateUnsavedDot(); });
  el.fieldFeatured.addEventListener('change', updateUnsavedDot);

  el.fieldBody.addEventListener('input', function () { updateStatsAndPreview(); updateUnsavedDot(); });

  el.savePostBtn.addEventListener('click', savePost);
  el.deletePostBtn.addEventListener('click', deleteCurrentPost);
  el.copyLinkBtn.addEventListener('click', copyLink);

  window.addEventListener('beforeunload', function (e) {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---- Init ----
  if (hasUsableToken()) {
    enterApp();
  } else {
    localStorage.removeItem('adminToken');
  }
})();
