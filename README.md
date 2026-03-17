# Summary

YNAB Tracker that does a better job at visualizing expenses than the official website.

# Dev

```bash
make run
```

# Deploy

First-time setup — authenticate with Cloudflare:

```bash
npx wrangler login
```

Then build and deploy:

```bash
npm run deploy
```

This deploys to `ynab.abhijeetrastogi.com`.
