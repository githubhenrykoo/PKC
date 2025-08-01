# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install Python and build dependencies required for canvas
RUN apk add --no-cache python3 make g++ pkgconfig cairo-dev jpeg-dev pango-dev giflib-dev

# Set Python path for node-gyp
ENV PYTHON=/usr/bin/python3

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Remove any static runtime-env.js files that would conflict with our dynamic API endpoint
# This ensures our dynamic /runtime-env.js API endpoint is not shadowed by static files
RUN find /app/dist -name "runtime-env.js" -type f -delete || true
RUN find /app/dist -name "runtime-env.*" -type f -delete || true

# Use Node.js for runtime stage instead of nginx
FROM node:20-alpine

WORKDIR /app

# Copy package.json files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy the built files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Set environment variable
ENV HOST=0.0.0.0
ENV PORT=4321

# Expose port 4321
EXPOSE 4321

# Start the application directly (no entrypoint script needed since we use dynamic API endpoint)
CMD ["npm", "start"]
