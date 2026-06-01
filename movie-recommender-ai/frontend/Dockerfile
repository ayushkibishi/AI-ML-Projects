FROM node:18-alpine

WORKDIR /app

# Copy dependency configuration and install packages
COPY package.json package-lock.json* ./
RUN npm install

# Copy application assets
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Start Vite dev server with network exposure
CMD ["npm", "run", "dev"]
