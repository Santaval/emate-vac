FROM node:22-alpine AS builder
WORKDIR /app

# Upgrade npm to match local dev version (avoids lock file validation mismatches)
RUN npm install -g npm@11

# Install dependencies (cached layer)
COPY vacation_system/package*.json ./
RUN npm ci

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
