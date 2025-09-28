# ---- Frontend build (Vite) ----
FROM node:20-bullseye-slim AS frontend-build
WORKDIR /app/frontend
COPY aesthetic-template-kit/package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY aesthetic-template-kit .
RUN npm run build

# ---- Server build (TypeScript) ----
FROM node:20-bullseye-slim AS server-build
WORKDIR /app
COPY package.json ./
# Install dependencies (tolerate peer dep mismatches in CI)
RUN npm install --no-audit --no-fund --legacy-peer-deps
COPY tsconfig.json build.ts ./
COPY src ./src
RUN npm run build

# ---- Runtime ----
FROM node:20-bullseye-slim
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Copy server dist and runtime deps
COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/node_modules ./node_modules

# Copy static assets
COPY public ./public
COPY --from=frontend-build /app/frontend/dist ./static

# UI_DIR points to built frontend; server falls back to /public if not set
ENV UI_DIR=/app/static

EXPOSE 3000
CMD ["node", "dist/web/server.js"]
