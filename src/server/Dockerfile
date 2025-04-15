# Step 1: Build the TypeScript app
FROM node:20 AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all TypeScript files to the container
COPY ./ ./

# Compile the TypeScript files into the dist folder
RUN npm run build  # This will run 'tsc' to compile TypeScript into the 'dist' folder

# Step 2: Set up the production environment
FROM node:20

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled JavaScript files from the builder stage
COPY --from=builder /app/dist /app/dist

# Set environment variables
ENV MEDIASOUP_LISTEN_IP=192.168.1.96
ENV MEDIASOUP_ANNOUNCED_IP=0.0.0.0
ENV SSL_KEY=./cert/key.pem
ENV SSL_CERT=./cert/cert.pem

# Expose port 3000
EXPOSE 3000

# Run the compiled JavaScript server
CMD ["node", "dist/server.js"]
