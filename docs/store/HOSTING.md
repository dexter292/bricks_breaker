# Hosting the privacy policy (HTTPS)

Task 2 of Plan 08-05 requires a **public HTTPS** URL that serves the same policy as `privacy-policy.md` / `privacy-policy.html` (D-24 / D-27).

This repo currently has **no git remote**, so GitHub Pages cannot be enabled from the agent alone. Use one of the options below, then reply in chat with the live URL (or type `hosted` after updating `LIVE_URL`).

## Preferred: GitHub Pages from `docs/store/`

1. Create / push a public GitHub repository for this project (add `origin` remote).
2. In the repo **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or default)
   - Folder: `/docs` **or** use a dedicated `gh-pages` branch that contains only the HTML at the site root
3. Simplest path that keeps the file where it lives today:
   - Enable Pages with **GitHub Actions** or a `gh-pages` branch
   - Publish `docs/store/privacy-policy.html` as the site’s `index.html` (or keep the path `/store/privacy-policy.html` if using `/docs` as the Pages root with a `store/` subfolder)

### Minimal `/docs` Pages layout (if Pages root = `/docs`)

Ensure `docs/store/privacy-policy.html` is reachable at:

`https://<user>.github.io/<repo>/store/privacy-policy.html`

Optional: add `docs/store/index.html` that redirects or mirrors the policy for a shorter URL.

4. After Pages is live, set in `privacy-policy.md`:

```text
LIVE_URL: https://<user>.github.io/<repo>/store/privacy-policy.html
```

Mirror the same URL in the HTML meta line if present.

5. Verify:

```bash
curl -fsSI "$LIVE_URL" | head -n 1
```

Expect `HTTP/2 200` or `HTTP/1.1 200`.

## Alternatives

| Host | Notes |
|------|--------|
| Cloudflare Pages | Drag-drop or connect repo; upload `privacy-policy.html` as `index.html` |
| Netlify Drop | Upload the HTML file; copy the `https://…netlify.app` URL |
| Any static HTTPS bucket | Same file content as in-repo HTML |

## Agent resume signal

Paste the live HTTPS URL in chat, **or** update `LIVE_URL` yourself and reply `hosted`. The executor will `curl -fsSI` and finish Plan 08-05 / PLT-04.

**Do not mark PLT-04 complete while `LIVE_URL` remains `TBD`.**
