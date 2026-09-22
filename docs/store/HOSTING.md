# Hosting the privacy policy (HTTPS)

Task 2 of Plan 08-05 requires a **public HTTPS** URL that serves the same policy as `privacy-policy.md` / `privacy-policy.html` (D-24 / D-27).

## Live URL (canonical)

**LIVE_URL:** https://dexter292.github.io/bricks_breaker/store/privacy-policy.html

Public repo: `https://github.com/dexter292/bricks_breaker`  
GitHub Pages: branch `main`, folder `/docs`.

Verify reachability **and** contact channel (F-55 / NF-3 — status code alone is not enough):

```bash
curl -fsSI "https://dexter292.github.io/bricks_breaker/store/privacy-policy.html" | head -n 1
curl -fsS "https://dexter292.github.io/bricks_breaker/store/privacy-policy.html" | grep -F 'github.com/dexter292/bricks_breaker/issues'
```

Expect `HTTP/2 200` (or `HTTP/1.1 200`) and a match on the issues URL.

## How it was set up

1. Public GitHub repository with `origin` remote.
2. Repo **Settings → Pages**: Deploy from branch `main`, folder `/docs`.
3. Policy reachable at `/store/privacy-policy.html` under the Pages site.

In-repo sources:

- `docs/store/privacy-policy.md`
- `docs/store/privacy-policy.html`

Keep `LIVE_URL` in `privacy-policy.md` in sync with this page.

## Alternatives (if Pages moves)

| Host | Notes |
|------|--------|
| Cloudflare Pages | Drag-drop or connect repo; upload `privacy-policy.html` as `index.html` |
| Netlify Drop | Upload the HTML file; copy the `https://…netlify.app` URL |
| Any static HTTPS bucket | Same file content as in-repo HTML |

## Historical note

An earlier owner waiver allowed continuing without a live HTTPS URL. That waiver is **superseded** — LIVE_URL above is live and is the PLT-04 / D-27 source of truth.
