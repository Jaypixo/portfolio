// ─── ADMIN PANEL BEHAVIOR ───
// Every action (create/edit/delete/publish toggle) saves immediately via
// the REST API — there's no separate "save everything" step to forget.

let authToken = localStorage.getItem('adminToken') || '';
let posts = [];
let editingId = null; // null = creating a new post
let slugTouched = false;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    authenticate();
  });
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('new-post-btn').addEventListener('click', () => openEditor(null));
  document.getElementById('cancel-edit-btn').addEventListener('click', closeEditor);
  document.getElementById('delete-btn').addEventListener('click', () => {
    if (editingId !== null) deletePost(editingId);
  });
  document.getElementById('post-form').addEventListener('submit', e => {
    e.preventDefault();
    savePost();
  });
  document.getElementById('title-input').addEventListener('input', onTitleInput);
  document.getElementById('slug-input').addEventListener('input', () => { slugTouched = true; });
  document.getElementById('content-input').addEventListener('input', () => { updatePreview(); updateWordCount(); });
  document.getElementById('search-input').addEventListener('input', renderPosts);
  document.getElementById('md-help-toggle').addEventListener('click', toggleMdHelp);

  if (authToken) showEditor();
});

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

async function authenticate() {
  const password = document.getElementById('password-input').value.trim();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errorEl.textContent = '';

  if (!password) {
    errorEl.textContent = 'Enter your password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    authToken = data.token;
    localStorage.setItem('adminToken', authToken);
    document.getElementById('password-input').value = '';
    showEditor();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log in';
  }
}

function logout() {
  authToken = '';
  localStorage.removeItem('adminToken');
  posts = [];
  closeEditor();
  document.getElementById('editor-screen').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('auth-screen').style.display = '';
}

function showEditor() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('editor-screen').style.display = '';
  document.getElementById('logout-btn').style.display = '';
  loadPosts();
}

// ─── POSTS LIST ───

async function loadPosts() {
  const listEl = document.getElementById('posts-list');
  try {
    const res = await fetch('/api/posts', { headers: authHeaders() });
    if (res.status === 401) return logout();
    if (!res.ok) throw new Error('Failed to load posts');
    posts = await res.json();
    renderPosts();

    const editId = new URLSearchParams(window.location.search).get('edit');
    if (editId && posts.some(p => String(p.id) === editId)) {
      openEditor(Number(editId));
    }
  } catch (err) {
    listEl.innerHTML = `<p class="admin-empty">Failed to load posts: ${escapeHtml(err.message)}</p>`;
  }
}

function renderPosts() {
  const listEl = document.getElementById('posts-list');
  const search = (document.getElementById('search-input').value || '').trim().toLowerCase();

  let visible = posts;
  if (search) {
    visible = visible.filter(post =>
      post.title.toLowerCase().includes(search) ||
      (post.tags || []).some(tag => tag.toLowerCase().includes(search))
    );
  }

  if (!visible.length) {
    listEl.innerHTML = '<p class="admin-empty">No posts yet. Create your first one.</p>';
    return;
  }

  listEl.innerHTML = visible.map(post => `
    <div class="admin-post ${editingId === post.id ? 'editing' : ''}" data-id="${post.id}">
      <div class="admin-post-main">
        <div class="admin-post-title">${escapeHtml(post.title)}</div>
        <div class="admin-post-meta">
          <span>${new Date(post.date).toLocaleDateString()}</span>
          <span>· ${estimateReadingTime(post.content)} min</span>
          <span class="status-pill ${post.published ? 'published' : 'draft'}">${post.published ? 'published' : 'draft'}</span>
          ${(post.tags || []).map(tag => `<span class="tag-chip-sm">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      <div class="admin-post-actions">
        <a href="post.html?slug=${encodeURIComponent(post.slug)}" target="_blank" class="icon-btn" title="View post">↗</a>
        <button class="icon-btn" title="${post.published ? 'Unpublish' : 'Publish'}" onclick="togglePublish(${post.id})">${post.published ? '☑' : '☐'}</button>
        <button class="icon-btn" title="Edit" onclick="openEditor(${post.id})">✎</button>
        <button class="icon-btn danger" title="Delete" onclick="deletePost(${post.id})">✕</button>
      </div>
    </div>
  `).join('');
}

// ─── EDITOR ───

function openEditor(id) {
  editingId = id;
  slugTouched = id !== null;

  const post = id !== null ? posts.find(p => p.id === id) : null;

  document.getElementById('editor-title').textContent = post ? 'Edit post' : 'New post';
  document.getElementById('title-input').value = post ? post.title : '';
  document.getElementById('slug-input').value = post ? post.slug : '';
  document.getElementById('tags-input').value = post ? (post.tags || []).join(', ') : '';
  document.getElementById('published-input').checked = post ? post.published : true;
  document.getElementById('content-input').value = post ? post.content : '';
  document.getElementById('delete-btn').style.display = post ? '' : 'none';

  updatePreview();
  updateWordCount();

  document.getElementById('editor-panel').style.display = '';
  document.getElementById('editor-screen').classList.add('has-editor');
  renderPosts();
  document.getElementById('editor-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditor() {
  editingId = null;
  document.getElementById('editor-panel').style.display = 'none';
  document.getElementById('editor-screen').classList.remove('has-editor');
  document.getElementById('post-form').reset();

  const url = new URL(window.location.href);
  if (url.searchParams.has('edit')) {
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url);
  }

  renderPosts();
}

function onTitleInput() {
  if (!slugTouched) {
    document.getElementById('slug-input').value = slugify(document.getElementById('title-input').value);
  }
}

function updatePreview() {
  const content = document.getElementById('content-input').value;
  const preview = document.getElementById('preview');
  preview.innerHTML = content.trim() ? markdownToHtml(content) : '<p class="admin-empty">Nothing to preview yet.</p>';
}

function updateWordCount() {
  const content = document.getElementById('content-input').value;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('word-count').textContent = `${words} word${words === 1 ? '' : 's'} · ${estimateReadingTime(content)} min read`;
}

function toggleMdHelp() {
  const help = document.getElementById('md-help');
  const btn = document.getElementById('md-help-toggle');
  const open = help.style.display !== 'none';
  help.style.display = open ? 'none' : '';
  btn.textContent = open ? 'markdown cheat sheet ▾' : 'markdown cheat sheet ▴';
}

// ─── SAVE / PUBLISH / DELETE ───

async function savePost() {
  const title = document.getElementById('title-input').value.trim();
  const content = document.getElementById('content-input').value.trim();
  const slug = document.getElementById('slug-input').value.trim();
  const tags = document.getElementById('tags-input').value.split(',').map(t => t.trim()).filter(Boolean);
  const published = document.getElementById('published-input').checked;

  if (!title || !content) {
    toast('> error: title and content are required');
    return;
  }

  const btn = document.getElementById('save-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const url = editingId !== null ? `/api/posts/${editingId}` : '/api/posts';
    const method = editingId !== null ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title, content, slug, tags, published })
    });

    if (res.status === 401) return logout();

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');

    toast(editingId !== null ? '> post updated' : '> post created');
    closeEditor();
    await loadPosts();
  } catch (err) {
    toast('> error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function togglePublish(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  try {
    const res = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ published: !post.published })
    });
    if (res.status === 401) return logout();
    if (!res.ok) throw new Error('Failed to update post');

    toast(post.published ? '> post unpublished' : '> post published');
    await loadPosts();
  } catch (err) {
    toast('> error: ' + err.message);
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;

  try {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) return logout();
    if (!res.ok) throw new Error('Failed to delete post');

    if (editingId === id) closeEditor();
    toast('> post deleted');
    await loadPosts();
  } catch (err) {
    toast('> error: ' + err.message);
  }
}
