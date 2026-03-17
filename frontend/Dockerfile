# ─────────────────────────────────────────
#  ReviseAI – Frontend (React / CRA)
#  Multi-stage: build → serve with Nginx
# ─────────────────────────────────────────

# ── Stage 1: Build the React app ──────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (use cache layer when package.json unchanged)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ─────────────
FROM nginx:stable-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config to support React Router (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
