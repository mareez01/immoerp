#!/bin/bash

# AMC ERP - Update Script for VPS
# This script updates the running application to the latest version

set -e

# Configuration
REGISTRY="ghcr.io"
OWNER="fl-smartech"
IMAGE_NAME="amc-erp"
VERSION="${1:-latest}"
CONTAINER_NAME="amc-erp-app"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}AMC ERP - Update${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

FULL_IMAGE_NAME="${REGISTRY}/${OWNER}/${IMAGE_NAME}:${VERSION}"

echo -e "${YELLOW}Updating to: ${FULL_IMAGE_NAME}${NC}"
echo ""

# Pull the latest image
echo -e "${YELLOW}Pulling latest image...${NC}"
docker pull "${FULL_IMAGE_NAME}"

# Stop the current container
echo -e "${YELLOW}Stopping current container...${NC}"
docker stop "${CONTAINER_NAME}"

# Remove the current container
echo -e "${YELLOW}Removing current container...${NC}"
docker rm "${CONTAINER_NAME}"

# Start new container with the updated image
echo -e "${YELLOW}Starting updated container...${NC}"
docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p 80:80 \
    --health-cmd "wget --quiet --tries=1 --spider http://localhost/ || exit 1" \
    --health-interval 30s \
    --health-timeout 3s \
    --health-retries 3 \
    --health-start-period 5s \
    "${FULL_IMAGE_NAME}"

echo ""
echo -e "${GREEN}Update completed successfully!${NC}"
echo ""
echo "Container status:"
docker ps --filter "name=${CONTAINER_NAME}"

# Cleanup old images
echo ""
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}Application updated and running!${NC}"
