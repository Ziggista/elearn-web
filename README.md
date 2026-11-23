# elearn-web (elearn.ziggi.dev)

Astro Starlight static site, served by Cloudflare Workers static assets (free tier). Markdown pages live in `src/content/docs/`.

- `src/content/docs/index.mdx` is the landing page. Add a `<Card>` per course.
- `src/content/docs/pki-tls/` holds the PKI & TLS training, quiz and presenter guide.
- Add a course: make a new folder under `src/content/docs/`, then add it to `sidebar` in `astro.config.mjs`.

## Run locally

    npm install
    npm run dev        # http://localhost:4321

## Deploy option A: from your machine (quickest)

Needs `ziggi.dev` to be a zone in your Cloudflare account.

    npx wrangler login
    npm run deploy

`wrangler.jsonc` attaches the custom domain `elearn.ziggi.dev` and creates its DNS record and certificate automatically.

## Deploy option B: push-to-deploy from git

1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → Workers & Pages → Create → Import a repository.
3. Build command `npm run build`, deploy command `npx wrangler deploy`.
4. Every push to the main branch redeploys.

## Keeping it private (optional)

The site is public by default. To restrict it, use Cloudflare Zero Trust → Access → Applications → add `elearn.ziggi.dev` with an email or domain allow rule (free for up to 50 users).
