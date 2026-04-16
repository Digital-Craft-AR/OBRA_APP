# Use official Puppeteer image (Node.js + Chromium pre-installed)
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copy package files
# NOTE: Railway's build context is the repo root, so paths are relative to it
COPY pdf-export-worker/package*.json ./

# Install Node dependencies (Chromium already included in base image)
RUN npm ci --omit=dev

# Copy application code
COPY pdf-export-worker/index.js ./
COPY pdf-export-worker/src ./src

# Fix ownership for pptruser (already exists in this image with UID 1000)
# Do NOT useradd here — it would conflict with the existing pptruser (UID 1000)
RUN chown -R pptruser:pptruser /app
USER pptruser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error('Health check failed')})" || exit 1

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", "index.js"]
