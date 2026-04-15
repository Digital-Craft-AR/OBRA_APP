# Use official Puppeteer image (Node.js + Chromium pre-installed)
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies (Chromium already included in base image)
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error('Health check failed')})" || exit 1

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", "index.js"]
