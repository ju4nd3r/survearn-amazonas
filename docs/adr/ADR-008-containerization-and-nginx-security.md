# ADR-008: Multi-Stage Containerization & Hardened Unprivileged Nginx

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
The repository must build and run via a single `docker compose up` command, support both `dev` (hot-reload) and `prod` profiles, run as a non-root user, expose a container healthcheck, and serve static PWA assets with strict security and caching headers.

## Decision
We implement a **multi-stage `Dockerfile`** (`node:22-alpine` builder → `nginxinc/nginx-unprivileged:1.27-alpine` runtime running as UID `101` on port `8080`) paired with a **`docker-compose.yml`** providing `prod` (default) and `dev` profiles and a custom `nginx/nginx.conf`.

## Rationale & Trade-offs
The unprivileged Nginx image eliminates root-container privilege escalation risks, compresses assets with `gzip`, enforces a strict Content-Security-Policy (CSP) with zero third-party trackers, serves `/healthz` for Docker healthchecks, and handles SPA fallback (`try_files $uri $uri/ /index.html`).

## Alternatives Rejected
- **Running `npm run dev` or `vite preview` in Production Container:** Leaves Node.js build toolchains in the runtime image (~400 MB vs ~25 MB) and lacks production-grade HTTP security headers.
- **Root Nginx Image (`nginx:alpine`):** Runs master process as `root` inside the container by default.
