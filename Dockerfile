# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

EXPOSE 3004

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3004"]