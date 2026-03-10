# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

ARG VITE_PAYPAL_CLIENT_ID
ENV VITE_PAYPAL_CLIENT_ID=$VITE_PAYPAL_CLIENT_ID

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Run backend ──────────────────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache su-exec

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

RUN mkdir -p /app/data

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]



