FROM node:20-alpine

RUN apk add --no-cache python3 make g++ postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all application files
COPY . .

# Expose port
EXPOSE 5000

# Development command
CMD ["npm", "run", "dev"]