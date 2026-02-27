FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=optional --ignore-scripts --no-audit --no-fund --prefer-offline \
  && test -f /app/node_modules/next/dist/bin/next

FROM node:20-alpine AS dev
WORKDIR /opt/devdeps
COPY package*.json ./
COPY --from=deps /app/node_modules/ /opt/devdeps/node_modules/
RUN test -f /opt/devdeps/node_modules/next/dist/bin/next

WORKDIR /app
COPY scripts/docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-entrypoint.sh

CMD ["/usr/local/bin/dev-entrypoint.sh"]

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules/ ./node_modules/
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules/ ./node_modules/

CMD ["npm","run","start","--","-H","0.0.0.0","-p","3000"]
