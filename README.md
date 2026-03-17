# Summary

YNAB Tracker that does a better job at visualizing expenses than the official website.

# Setup

Paste this config when the UI starts up for the first time. After hitting submit, the UI should automatically finish loading the transactions.

```bash
[ynab]
token = ""
budget_id = ""

[app]
# YYYY-MM-DD, defaults to start of current quarter
sync_since = "2026-01-01"
```

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
