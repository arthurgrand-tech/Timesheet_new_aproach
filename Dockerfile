# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client \
    curl

# Set working directory
WORKDIR /app

# Set npm config
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 600000

# Copy only to keep healthcheck and runtime
COPY . .

# Create necessary directories
RUN mkdir -p dist/public migrations

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]
