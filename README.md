# Jaypix portfolio

Static site (Cloudflare Pages) with a small blog + admin backed by Pages Functions and KV.

## Blog backend setup

The blog (`blog.html`, `post.html`) and admin editor (`admin.html`) need a KV namespace
and two environment variables configured on the Cloudflare Pages project before
`/api/*` will work.

### 1. Create a KV namespace

Cloudflare Dashboard → **Workers & Pages** → **KV** → **Create a namespace** → name it `BLOG`.

### 2. Bind it to the Pages project

Pages project → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**:
- Variable name: `BLOG`
- Namespace: `BLOG`

### 3. Set environment variables

Pages project → **Settings** → **Environment variables**:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | The password used to log into `/admin.html` |
| `ADMIN_TOKEN_SECRET` | A random 32+ character string (signs the admin session token) |

### 4. Redeploy

Retry the latest deployment so the new binding/variables take effect.

## How it works

- Posts are stored as a single JSON array under the KV key `posts`.
- `GET /api/posts` returns published posts only unless called with a valid admin
  bearer token, in which case it returns everything (including drafts).
- `POST /api/posts`, `PUT /api/posts/:slug`, `DELETE /api/posts/:slug` all require
  the admin bearer token issued by `POST /api/login`.
- Markdown is rendered client-side with [Remarker](https://remarkerwebsite.pages.dev/remarker.js),
  loaded via `<script>` tag on `admin.html` (live preview) and `post.html` (published posts).
