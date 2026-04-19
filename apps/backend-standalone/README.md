# Standalone backend (`@archive-helper/backend-standalone`)

Express server that exposes unlink and inbound-count HTTP endpoints using the same **domain** services and **CMA repository** implementation as the Contentful Functions flavor.

## Commands

```bash
cp apps/backend-standalone/.env.example apps/backend-standalone/.env
npm run dev -w @archive-helper/backend-standalone
```

See the root README and `docs/guides/backend.md` for endpoint details and deployment notes.
