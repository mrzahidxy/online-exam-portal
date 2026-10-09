FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PORT=8080 HOST=0.0.0.0 NODE_ENV=production

# Copy package files and install all dependencies (including dev dependencies for build)
COPY package*.json ./

# Copy all
COPY . .

# Install Dependencies
RUN npm install

# Compile TypeScript in the image; application secrets are supplied at runtime.
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

EXPOSE $PORT

CMD ["npm", "run", "start:prod"]
