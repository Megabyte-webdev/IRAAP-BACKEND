# Use lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Expose app port
EXPOSE 8000

# Start app
CMD ["pnpm", "run", "dev"]