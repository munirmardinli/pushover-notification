# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_TAG=22-alpine
FROM node:${NODE_TAG}

RUN apk add --no-cache wget ca-certificates

RUN mkdir -p \
	/home/node/app/node_modules \
	/home/node/app/assets && \
	chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package.json /home/node/app/package.json
COPY --chown=node:node node_modules /home/node/app/node_modules
COPY --chown=node:node lib /home/node/app/lib

VOLUME /home/node/app/assets

USER node

ARG BUILD_TIMESTAMP
ARG BRANCH
ARG GITHUB_REPO
ARG GITHUB_OWNER
ARG GITHUB_SHA
ARG IMAGE_TITLE
ARG IMAGE_DESCRIPTION
ARG REPO_LICENSE

ENV UID=1026
ENV GID=100
ENV PORT=9095
ENV PUSHOVER_API_TOKEN
ENV PUSHOVER_USER_KEY
ENV NODE_ENV=production
ENV TZ=Europe/Berlin
ENV ASSETS_DIR=/home/node/app/assets

EXPOSE ${PORT}

LABEL org.opencontainers.image.title="${IMAGE_TITLE}"
LABEL org.opencontainers.image.description="${IMAGE_DESCRIPTION}"
LABEL org.opencontainers.image.vendor="${GITHUB_OWNER}"
LABEL org.opencontainers.image.authors="${GITHUB_OWNER} <munir@mardinli.de>"
LABEL org.opencontainers.image.url="https://hub.docker.com/r/${GITHUB_OWNER}/${IMAGE_TITLE}"
LABEL org.opencontainers.image.documentation="https://github.com/${GITHUB_REPO}#readme"
LABEL org.opencontainers.image.source="https://github.com/${GITHUB_REPO}"
LABEL org.opencontainers.image.version="${BRANCH}"
LABEL org.opencontainers.image.revision="${GITHUB_SHA}"
LABEL org.opencontainers.image.created="${BUILD_TIMESTAMP}"
LABEL org.opencontainers.image.licenses="${REPO_LICENSE}"
LABEL com.docker.desktop.extension.api.version=">= 1.0.0"

LABEL com.docker.extension.additional-urls="https://${GITHUB_OWNER}.github.io/${IMAGE_TITLE}"
LABEL com.docker.extension.screenshots="https://profile-images.xing.com/images/22b60162f0c35aafb7f44323785a5616-4/munir-mardinli.1024x1024.jpg"
LABEL com.docker.extension.publisher-url="https://mardinli.de"
LABEL com.docker.extension.changelog-url="https://github.com/${GITHUB_REPO}/releases"
LABEL com.docker.extension.legal-url="https://github.com/${GITHUB_REPO}/blob/${BRANCH}/LICENSE"

LABEL com.centurylinklabs.watchtower.enable="true"

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1
		
CMD ["sh", "-c", "node lib/src/index.js"]
