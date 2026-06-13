# Portfolio Blog with Cloudflare Pages Backend

This project is a static portfolio site with a Cloudflare Pages Functions backend for secure blog administration.

## How it works

- `blog.html` lists posts and `post.html` renders a single post, both via `/api/posts`
- `admin.html` logs in via `/api/login` and manages posts through the REST API below
- `/api/posts*` reads from and writes to **Cloudflare KV** (not GitHub)
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

### 4. Redeploy

Click **Retry deployment** on your latest deployment to apply the KV binding.

---

## API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | optional | List posts, sorted newest first. Drafts are only included when an admin token is sent. |
| POST | `/api/posts` | admin | Create a post. Body: `{ title, content, slug?, tags?, published? }` |
| GET | `/api/posts/:idOrSlug` | optional | Fetch a single post by id or slug. Drafts require an admin token. |
| PUT | `/api/posts/:id` | admin | Update a post. Any subset of `{ title, content, slug, tags, published }`. |
| DELETE | `/api/posts/:id` | admin | Delete a post. |
| POST | `/api/login` | — | Body: `{ password }` → `{ token, exp }`. Token is a 12-hour HMAC-signed session. |

Posts are stored as a single JSON array under the `posts` key in the `BLOG` KV namespace. Each post has:

```json
{
  "id": 1700000000000,
  "slug": "my-first-post",
  "title": "My First Post",
  "content": "Markdown content...",
  "tags": ["dev", "life"],
  "published": true,
  "date": "2024-01-01T00:00:00.000Z",
  "updated": "2024-01-01T00:00:00.000Z"
}
```

`slug`, `tags`, `published`, and `updated` are filled in automatically for older posts that predate these fields.

---

## Admin usage

1. Visit `admin.html` and enter `ADMIN_PASSWORD`
2. Click **+ new post**, write markdown with a live preview, add tags, and toggle **published**
3. Every save/edit/delete/publish action writes straight to Cloudflare KV — there's no separate "save everything" step

The blog list (`blog.html`) supports searching and filtering by tag. Each post page (`post.html`) shows reading time, tags, and links to the previous/next post.

---

## Notes

- Posts are stored in Cloudflare KV, not in GitHub — no commits
- The blog is read-only for public visitors; drafts (`published: false`) never appear on `blog.html` or `post.html` for non-admins
- Only authenticated admins can create/edit/delete posts or see drafts
- KV is replicated globally on Cloudflare's network, so posts load fast everywhere
