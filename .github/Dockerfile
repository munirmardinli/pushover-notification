
FROM node:18-alpine

ARG NODE_ENV
ARG BUILD_TIMESTAMP
ARG BRANCH

RUN apk add --no-cache wget ca-certificates

RUN mkdir -p \
	/home/node/app/node_modules \
	/home/node/app/dist/assets

WORKDIR /home/node/app

COPY --chown=node:node package.json /home/node/app/package.json
COPY --chown=node:node node_modules /home/node/app/node_modules
COPY --chown=node:node dist/src /home/node/app/dist/src

VOLUME /home/node/app/dist/assets

USER node

EXPOSE 9095

ARG NODE_ENV
ARG BUILD_TIMESTAMP
ARG BRANCH
ARG GITHUB_REPO
ARG GITHUB_OWNER
ARG GITHUB_SHA
ARG IMAGE_TITLE
ARG IMAGE_DESCRIPTION
ARG REPO_LICENSE
ARG REPO_CATEGORIES

ENV NODE_ENV=${NODE_ENV}

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
LABEL com.docker.extension.categories="${REPO_CATEGORIES}"
LABEL com.docker.extension.screenshots="https://profile-images.xing.com/images/22b60162f0c35aafb7f44323785a5616-4/munir-mardinli.1024x1024.jpg"

LABEL com.docker.extension.publisher-url="https://mardinli.de"
LABEL com.docker.extension.changelog-url="https://github.com/${GITHUB_REPO}/releases"
LABEL com.docker.extension.legal-url="https://github.com/${GITHUB_REPO}/blob/${BRANCH}/LICENSE"

LABEL com.centurylinklabs.watchtower.enable="true"

CMD ["sh", "-c", "cd dist && node src/index.js"]
