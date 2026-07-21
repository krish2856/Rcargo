# Use the official Node.js 18 image based on Alpine Linux for a smaller footprint
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the root package.json 
COPY package*.json ./

# Create the backend directory and copy its package.json
RUN mkdir backend
COPY backend/package*.json ./backend/

# Install dependencies (this will run the install:all script from root package.json)
RUN npm run install:all

# Copy the rest of the application code (backend and frontend)
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
