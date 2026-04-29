FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install nodemon globally
RUN npm install -g nodemon

WORKDIR /app

# Environment variables with defaults from .env.example
ARG PORT=8080
ARG HOST=localhost
ARG NODE_ENV=development
ARG TRUST_PROXY=false
ARG DATABASE_URL
ARG DIRECT_URL
ARG JWT_SECRET
ARG JWT_EXPIRES_IN=60m
ARG JWT_ISSUER=e-assessment-api
ARG ACCESS_TOKEN_TTL_MINUTES=60
ARG ACCESS_TOKEN_COOKIE_NAME=auth-token
ARG COOKIE_SECURE=false
ARG COOKIE_SAME_SITE=lax
ARG CORS_ORIGIN
ARG GCP_BUCKET_NAME
ARG CLIENT_URL
ARG MAX_UPLOAD_SIZE=5242880

ENV PORT=$PORT \
    HOST=$HOST \
    NODE_ENV=$NODE_ENV \
    TRUST_PROXY=$TRUST_PROXY \
    DATABASE_URL=$DATABASE_URL \
    DIRECT_URL=$DIRECT_URL \
    JWT_SECRET=$JWT_SECRET \
    JWT_EXPIRES_IN=$JWT_EXPIRES_IN \
    JWT_ISSUER=$JWT_ISSUER \
    ACCESS_TOKEN_TTL_MINUTES=$ACCESS_TOKEN_TTL_MINUTES \
    ACCESS_TOKEN_COOKIE_NAME=$ACCESS_TOKEN_COOKIE_NAME \
    COOKIE_SECURE=$COOKIE_SECURE \
    COOKIE_SAME_SITE=$COOKIE_SAME_SITE \
    CORS_ORIGIN=$CORS_ORIGIN \
    GCP_BUCKET_NAME=$GCP_BUCKET_NAME \
    CLIENT_URL=$CLIENT_URL \
    MAX_UPLOAD_SIZE=$MAX_UPLOAD_SIZE

# Copy package files and install all dependencies (including dev dependencies for build)
COPY package*.json ./

# Copy all
COPY . .

# Install Dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

EXPOSE $PORT

CMD ["npm", "run", "dev"]
