# ==========================================
# AquaTrust AI - Production Frontend Dockerfile
# Multi-stage build: Node.js (Build) -> Nginx (Serve)
# ==========================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies required for vite build)
RUN npm install

# Copy source code and config
COPY . .

# Set API base URL to relative /api/v1 so reverse proxy handles it seamlessly on any device
ENV VITE_API_BASE_URL=/api/v1

# Build optimized static distribution
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
