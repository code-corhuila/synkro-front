# syntax=docker/dockerfile:1

# Build stage: Node 22, a clean install from the lockfile, then the production build.
FROM node:22-alpine AS build
WORKDIR /app

# The gateway address and the development sign-in are fixed at build time: Vite
# bakes them into the bundle. The sign-in is off unless a build argument turns it
# on, so an image built for qa or main never contains it.
ARG VITE_API_BASE_URL
ARG VITE_DEV_SIGN_IN=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_DEV_SIGN_IN=$VITE_DEV_SIGN_IN

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
# With the sign-in off, fail the image build if the bundle still holds it.
RUN if [ "$VITE_DEV_SIGN_IN" != "true" ]; then npm run check:production-build; fi

# Serve stage: only the built files and the nginx config.
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
