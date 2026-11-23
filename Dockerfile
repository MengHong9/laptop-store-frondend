# ---- Build the static site ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Leave VITE_API_BASE_URL empty: the browser calls /api on its own origin and nginx forwards it to the backend
RUN npm run build

# ---- Serve it with nginx ----
FROM nginx:1.27-alpine
# nginx:alpine renders *.template files with environment variables at start-up
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_UPSTREAM=http://app:8080
EXPOSE 80
