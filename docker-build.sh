#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PLATFORM="linux/amd64"
IMAGE="bladerunner2020/smart-home-web"
VERSION="$(node -p "require('./package.json').version")"

echo "Building ${IMAGE}:${VERSION} for ${PLATFORM}..."

docker buildx build \
  --platform "${PLATFORM}" \
  -t "${IMAGE}:${VERSION}" \
  -t "${IMAGE}:latest" \
  --load \
  .

echo "Done: ${IMAGE}:${VERSION}, ${IMAGE}:latest"
