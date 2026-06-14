FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (npm ci fails on cross-platform lock files; npm install resolves
# linux-specific optional deps like @emnapi/runtime that macOS lock files omit)
COPY vacation_system/package.json ./
RUN npm install

# Copy source (node_modules and .next excluded via .dockerignore)
COPY vacation_system/ .

# Generate Prisma client from schema
RUN npx prisma generate

# Build Next.js standalone output
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/false -D appuser

COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/public ./public

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
