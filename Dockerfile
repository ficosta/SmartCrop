FROM node:14-alpine

# Install dependencies required for canvas
RUN apk add --no-cache build-base cairo-dev pango-dev libpng-dev jpeg-dev giflib-dev

WORKDIR /app

# Copy dependency definitions and install them
COPY package*.json ./
RUN npm install

# Copy the application source code
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
