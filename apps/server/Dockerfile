# Use official Node.js image
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Copy root config files
COPY package.json ./
COPY package-lock.json* ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy server app
COPY apps/server ./apps/server

# Upgrade npm to a modern version
RUN npm install -g npm@11.12.1

# Patch server package.json to replace workspace:* with a local file: reference
# so we can install dependencies without relying on npm workspace handling in the image
RUN node -e "const fs=require('fs');const p='apps/server/package.json';const pkg=JSON.parse(fs.readFileSync(p));if(pkg.dependencies && pkg.dependencies['@poker/shared'] && pkg.dependencies['@poker/shared'].startsWith('workspace:')){pkg.dependencies['@poker/shared']='file:../../packages/shared';fs.writeFileSync(p,JSON.stringify(pkg,null,2));console.log('patched @poker/shared');}else{console.log('no patch needed');}"

# Install only server runtime dependencies later in server workdir

# Final stage for server
WORKDIR /usr/src/app/apps/server
RUN npm install --production
EXPOSE 3000
CMD ["npm", "run", "dev"]
