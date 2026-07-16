# Backend - Install deps, generate Prisma, run migrations, start server
FROM node:20-alpine

WORKDIR /app

# Copy source code (no node_modules in zip)
COPY . .

# Install all dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Run migrations first, then start the server
CMD ["sh", "-c", "node src/database/runMigrations.js && node src/server.js"]
