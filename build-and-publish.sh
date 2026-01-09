#!/bin/bash

# AMC ERP - Docker Build and Push Script for GitHub Container Registry
# This script builds the Docker image and pushes it to GHCR

set -e

# Configuration
REGISTRY="ghcr.io"
OWNER="fl-smartech"  # Change this to your GitHub username or organization
IMAGE_NAME="amc-erp"
VERSION="${1:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}AMC ERP - Build and Publish${NC}"
echo -e "${GREEN}======================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if logged in to GitHub Container Registry
echo -e "${YELLOW}Checking GitHub Container Registry authentication...${NC}"
if ! docker info 2>/dev/null | grep -q "ghcr.io"; then
    echo -e "${YELLOW}Please login to GitHub Container Registry first:${NC}"
    echo "  docker login ghcr.io -u <USERNAME> -p <GITHUB_TOKEN>"
    echo ""
    echo "To create a token:"
    echo "  1. Go to GitHub Settings > Developer settings > Personal access tokens"
    echo "  2. Generate new token (classic) with 'write:packages' scope"
    exit 1
fi

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${OWNER}/${IMAGE_NAME}:${VERSION}"
LATEST_IMAGE_NAME="${REGISTRY}/${OWNER}/${IMAGE_NAME}:latest"

echo -e "${YELLOW}Building Docker image: ${FULL_IMAGE_NAME}${NC}"

# Build the Docker image
docker build \
    --platform linux/amd64 \
    --tag "${FULL_IMAGE_NAME}" \
    --tag "${LATEST_IMAGE_NAME}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="${VERSION}" \
    .

echo -e "${GREEN}✓ Build completed successfully${NC}"

# Push to registry
echo -e "${YELLOW}Pushing to GitHub Container Registry...${NC}"
docker push "${FULL_IMAGE_NAME}"

if [ "${VERSION}" != "latest" ]; then
    docker push "${LATEST_IMAGE_NAME}"
fi

echo -e "${GREEN}✓ Push completed successfully${NC}"
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Image published successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Image: ${FULL_IMAGE_NAME}"
echo ""
echo "To pull this image:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "To run this image:"
echo "  docker run -d -p 80:80 ${FULL_IMAGE_NAME}"
