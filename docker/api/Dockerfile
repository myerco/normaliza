FROM node:22-alpine

WORKDIR /app

COPY docker/api/package.json ./
RUN npm install --omit=dev

COPY docker/api/src ./src
COPY supabase/functions/_shared ./shared
COPY db/migrations ./migrations

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
