# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build & Validate ("builder")
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy project source and validate content + build production bundle
COPY . .
RUN npm run validate:content && npm run typecheck && npm run build

# ==============================================================================
# Stage 2: Hardened Unprivileged Nginx Runtime ("prod")
# ==============================================================================
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

# Copy custom Nginx configuration (gzip, CSP, caching, SPA fallback, /healthz)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static PWA files from builder stage with non-root ownership
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Run as non-root user (UID 101 in nginx-unprivileged)
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
