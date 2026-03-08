# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-08

### Added

- Initial release of `LLM API Proxy Dashboard`.
- Generic HTTP proxy endpoint: `app/api/proxy/route.ts`.
- Request log APIs: `app/api/logs/route.ts` and `app/api/stats/route.ts`.
- Dashboard pages for overview and history: `app/page.tsx` and `app/logs/page.tsx`.
- Request detail dialog for inspecting headers/bodies/tokens.
- Stream (SSE) response handling and usage extraction.
- Sensitive header masking for log safety.
- Prisma schema and PostgreSQL persistence.
- Prettier configuration (`semi: false`, `singleQuote: true`, `printWidth: 120`).
- Repository publish essentials:
  - `LICENSE` (MIT)
  - `.env.example`
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`)

### Changed

- Updated README setup flow to use `.env.example`.
- Expanded request detail dialog width for better readability.
- Cleaned lint warnings in proxy and logs pages.

### Validation

- `npm run lint` passes.
- `npm run build` passes.
- `npx prisma validate` passes.
