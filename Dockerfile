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

# Use Node.js to start the application
CMD ["npm", "start"]
