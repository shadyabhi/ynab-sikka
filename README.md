# Summary

YNAB Tracker that does a better job at visualizing expenses than the official website.

# Dev

```bash
$ npx wrangler dev
Need to install the following packages:
wrangler@4.74.0
Ok to proceed? (y) y

 ⛅️ wrangler 4.74.0
───────────────────

Cloudflare collects anonymous telemetry about your usage of Wrangler. Learn more at https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler/telemetry.md
╭──────────────────────────────────────────────────────────────────────╮
│  [b] open a browser [d] open devtools [c] clear console [x] to exit  │
╰──────────────────────────────────────────────────────────────────────╯
⎔ Starting local server...
[wrangler:info] Ready on http://localhost:8787
```

# Deploy

```bash
# First time setup to login
npx wrangler login

```

Then build and deploy:

```bash
npm run deploy
```

This deploys to `ynab.abhijeetrastogi.com`.
