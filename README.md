# Portfolio Blog with Cloudflare Pages Backend

This project is a static portfolio site with a Cloudflare Pages Functions backend for secure blog administration.

## How it works

- `index.html` loads blog posts from `/api/posts`
- `admin.html` logs in via `/api/login`
- `/api/posts` reads `posts.json` for public display and writes updates back to GitHub using the GitHub API
- sensitive values are stored in Cloudflare Pages environment secrets, not in the public code

## Required Cloudflare Pages variables

Set these in your Cloudflare Pages project settings:

- `ADMIN_PASSWORD` — the password you will use to log in at `admin.html`
- `ADMIN_TOKEN_SECRET` — a random string used to sign session tokens
- `GITHUB_OWNER` — e.g. `Jaypixo`
- `GITHUB_REPO` — e.g. `portfolio`
- `GITHUB_BRANCH` — usually `main`
- `GITHUB_TOKEN` — personal access token with repo write permissions

## Deploy steps

1. Connect the GitHub repo to Cloudflare Pages.
2. Enable Functions in Cloudflare Pages (it will use the `functions/` folder).
3. Add the environment variables above in Pages settings.
4. Deploy the site.

## Admin usage

1. Visit `admin.html`
2. Enter `ADMIN_PASSWORD`
3. Add, edit, or delete posts
4. Click **Save changes to GitHub**

The backend will commit changes to `posts.json` in your repository.

## Notes

- This is a secure admin panel because secrets are stored in Cloudflare and the GitHub token is not in public assets.
- The password is not stored in the browser source; it is validated by the Cloudflare function.
- If you want stronger auth, we can add two-factor or integrate a modern auth provider next.
