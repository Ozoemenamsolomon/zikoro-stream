# Install dependencies and build
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Use a minimal Node image for running the app
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app ./
RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 3000

CMD ["npm", "start"]

