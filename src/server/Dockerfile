# Step 1: Build the TypeScript app with required build tools
FROM node:20 AS builder

WORKDIR /app

ENV MEDIASOUP_WORKER_PREBUILT=false

RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy and build source
COPY . .
RUN npm run build

# Step 2: Production image — no unnecessary build tools
FROM node:20-slim

WORKDIR /app

# Only copy runtime dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built code from builder
COPY --from=builder /app/dist /app/dist

# If certs are needed at runtime, be sure to copy them
COPY ./cert ./cert

# Set environment variables
ENV MEDIASOUP_LISTEN_IP=0.0.0.0
ENV MEDIASOUP_ANNOUNCED_IP=127.0.0.1
ENV SSL_KEY=./cert/key.pem
ENV SSL_CERT=./cert/cert.pem
ENV SUPABASE_URL=https://ddlepujpbqjoogkmiwfu.supabase.co
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbGVwdWpwYnFqb29na21pd2Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMTYwNjQ5NCwiZXhwIjoyMDE3MTgyNDk0fQ.Z4cc23CFZ8Ra7YLsphgvbEW6d_nrOKKCmYao6sA7_Jc

# Expose app port
EXPOSE 3000

# Start the app
CMD ["node", "dist/server.js"]
