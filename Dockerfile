# TaskBoard API - Production Dockerfile
# Build: docker build -t taskboard-api .
# Run:   docker run -d -p 3000:3000 --name taskboard-api taskboard-api

FROM node:24-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY dist ./dist
COPY .env.production .env

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S taskboard -u 1001 -G nodejs

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R taskboard:nodejs /app/data

# Switch to non-root user
USER taskboard

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require("http").get("http://localhost:3000/health", (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["node", "dist/server.js"]