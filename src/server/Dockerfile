
# Stage 1: Builder
FROM node:20 AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && \
    apt-get install -y python3-pip make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy and build source
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Copy only production deps
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy built code
COPY --from=builder /app/dist /app/dist

# Copy prebuilt Mediasoup worker binary
COPY --from=builder /app/node_modules/mediasoup/worker/out/Release/mediasoup-worker /app/node_modules/mediasoup/worker/out/Release/

# If needed for HTTPS
COPY ./cert ./cert

# Environment variables
ENV NODE_ENV=development
ENV MEDIASOUP_WORKER_PREBUILT=true
ENV MEDIASOUP_LISTEN_IP=0.0.0.0
ENV MEDIASOUP_ANNOUNCED_IP=192.168.109.187
ENV MEDIASOUP_MIN_PORT=42000
ENV MEDIASOUP_MAX_PORT=42050
ENV SSL_KEY=./cert/key.pem
ENV SSL_CERT=./cert/cert.pem
ENV SUPABASE_URL=https://ddlepujpbqjoogkmiwfu.supabase.co
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbGVwdWpwYnFqb29na21pd2Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMTYwNjQ5NCwiZXhwIjoyMDE3MTgyNDk0fQ.Z4cc23CFZ8Ra7YLsphgvbEW6d_nrOKKCmYao6sA7_Jc

# Ports for server + WebRTC
EXPOSE 3000/tcp
EXPOSE 42000-42050/udp

CMD ["node", "dist/server.js"]
