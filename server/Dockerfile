FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the TypeScript code
RUN npx tsc

# Create a directory for the database
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
