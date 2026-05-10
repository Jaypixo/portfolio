# Portfolio Blog with Cloudflare Pages Backend

This project is a static portfolio site with a Cloudflare Pages Functions backend for secure blog administration.

## How it works

- `index.html` loads blog posts from `/api/posts`
- `admin.html` logs in via `/api/login`
- `/api/posts` reads from and writes to **Cloudflare KV** (not GitHub)
- Authentication and secrets are stored in Cloudflare Pages environment variables

## Required Cloudflare Pages setup

### 1. Create a KV Namespace

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. Click **KV** in the sidebar
3. Click **Create a namespace**
4. Name it: `BLOG`
5. Click **Create**

### 2. Bind KV to your Pages project

1. Go to your **Pages project** (portfolio)
2. **Settings** → **Functions**
3. Under **KV namespace bindings**, click **Add binding**
4. **Variable name**: `BLOG`
5. **Namespace**: select `BLOG` from the dropdown
6. Click **Save**

### 3. Add environment variables

In **Settings** → **Environment variables**, add:

| Name | Value |
|------|-------|
| `ADMIN_PASSWORD` | Your secret password |
| `ADMIN_TOKEN_SECRET` | Random 32+ char string |

(You no longer need `GITHUB_*` variables)

### 4. Redeploy

Click **Retry deployment** on your latest deployment to apply the KV binding.

---

## Admin usage

1. Visit `admin.html`
2. Enter `ADMIN_PASSWORD`
3. Add, edit, or delete posts
4. Click **Save to Cloudflare KV**

Posts save instantly to KV and are served globally from Cloudflare's edge.

---

## Notes

- Posts are stored in Cloudflare KV, not in GitHub — no commits
- The blog is read-only for public visitors
- Only authenticated admins can create/edit/delete
- KV is replicated globally on Cloudflare's network, so posts load fast everywhere

